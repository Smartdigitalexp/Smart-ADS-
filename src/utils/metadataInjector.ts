import * as piexif from 'piexifjs';

/**
 * Utility for embedding Google/Facebook GPano Projection Metadata (XMP) 
 * directly into spherical JPEG/JPG images fully inside the browser client.
 * This guarantees Meta/Facebook correctly identifies and prompts the interactive 360° viewer.
 */

/**
 * Injects GPano projection metadata into the JPEG binary stream.
 * 
 * @param jpegBytes Uint8Array containing the raw original JPEG file bytes.
 * @param width The image width (e.g. 7680 for 8K)
 * @param height The image height (e.g. 3840 for 8K)
 * @returns Uint8Array containing the new JPEG file with integrated 360° GPano EXIF + XMP APP1 segments.
 */
export function injectGPanoMetadata(jpegBytes: Uint8Array, width: number, height: number): Uint8Array {
  // Check SOI marker (Start of Image = FF D8)
  if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    console.warn("JPEG SOI marker (FFD8) missing. Base image might not be a standard JPEG.");
    return jpegBytes;
  }

  // 1. Inject EXIF using piexifjs (Meta heavily relies on Make: RICOH for 360 detection)
  let exifResult = jpegBytes;
  try {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < jpegBytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(jpegBytes.subarray(i, i + chunkSize)));
    }
    const b64 = btoa(binary);
    const dataUrl = `data:image/jpeg;base64,${b64}`;

    let exifObj = piexif.load(dataUrl);
    if (!exifObj["0th"]) exifObj["0th"] = {};
    
    // Facebook specifically recognizes Ricoh Theta S as 360 photos natively
    exifObj["0th"][piexif.ImageIFD.Make] = "RICOH";
    exifObj["0th"][piexif.ImageIFD.Model] = "RICOH THETA S";

    const exifBytesStr = piexif.dump(exifObj);
    const modifiedDataUrl = piexif.insert(exifBytesStr, dataUrl);
    
    const finalB64 = modifiedDataUrl.split(',')[1];
    const finalBinary = atob(finalB64);
    exifResult = new Uint8Array(finalBinary.length);
    for (let i = 0; i < finalBinary.length; i++) {
        exifResult[i] = finalBinary.charCodeAt(i);
    }
  } catch (err) {
    console.warn("Exif injection via piexif failed (skipping):", err);
    exifResult = jpegBytes;
  }

  // 2. Inject XMP manually by placing it right after SOI
  // Construct the standardized Google/Meta GPano XMP Metadata
  const xmpString = `<?xpacket begin="\\xEF\\xBB\\xBF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/">
   <GPano:ProjectionType>equirectangular</GPano:ProjectionType>
   <GPano:UsePanoramaViewer>True</GPano:UsePanoramaViewer>
   <GPano:CroppedAreaImageWidthPixels>${width}</GPano:CroppedAreaImageWidthPixels>
   <GPano:CroppedAreaImageHeightPixels>${height}</GPano:CroppedAreaImageHeightPixels>
   <GPano:FullPanoWidthPixels>${width}</GPano:FullPanoWidthPixels>
   <GPano:FullPanoHeightPixels>${height}</GPano:FullPanoHeightPixels>
   <GPano:CroppedAreaLeftPixels>0</GPano:CroppedAreaLeftPixels>
   <GPano:CroppedAreaTopPixels>0</GPano:CroppedAreaTopPixels>
   <GPano:PoseHeadingDegrees>180.0</GPano:PoseHeadingDegrees>
   <GPano:PosePitchDegrees>0.0</GPano:PosePitchDegrees>
   <GPano:PoseRollDegrees>0.0</GPano:PoseRollDegrees>
   <GPano:InitialViewHeadingDegrees>180.0</GPano:InitialViewHeadingDegrees>
   <GPano:InitialViewPitchDegrees>0.0</GPano:InitialViewPitchDegrees>
   <GPano:InitialViewRollDegrees>0.0</GPano:InitialViewRollDegrees>
   <GPano:InitialHorizontalFOVDegrees>90.0</GPano:InitialHorizontalFOVDegrees>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const encoder = new TextEncoder();
  const xmpBytes = encoder.encode(xmpString);
  const xmpHeader = encoder.encode("http://ns.adobe.com/xap/1.0/\0");
  const payloadLength = 2 + xmpHeader.length + xmpBytes.length;

  if (payloadLength <= 65535) {
    const app1Segment = new Uint8Array(2 + payloadLength);
    app1Segment[0] = 0xFF;
    app1Segment[1] = 0xE1;
    app1Segment[2] = (payloadLength >> 8) & 0xFF;
    app1Segment[3] = payloadLength & 0xFF;
    app1Segment.set(xmpHeader, 4);
    app1Segment.set(xmpBytes, 4 + xmpHeader.length);

    const finalResult = new Uint8Array(exifResult.length + app1Segment.length);
    finalResult.set(exifResult.subarray(0, 2), 0); // Copy SOI
    finalResult.set(app1Segment, 2); // Copy XMP APP1
    finalResult.set(exifResult.subarray(2), 2 + app1Segment.length); // Copy rest
    return finalResult;
  }

  return exifResult;
}

/**
 * Injects Spherical Video V2 (GPano) metadata as a top-level UUID box in an MP4 file.
 * This instructs players like Facebook and YouTube to treat the MP4 as a 360/VR video.
 */
export function injectSphericalMetadataToMP4(base64DataUrl: string): string {
  if (!base64DataUrl.startsWith('data:video/mp4;base64,')) {
    return base64DataUrl;
  }
  
  const b64Data = base64DataUrl.split(',')[1];
  const binaryString = atob(b64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const xml = `<?xml version="1.0"?><rdf:SphericalVideo xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:gsph="http://ns.google.com/videos/1.0/spherical/"><gsph:Spherical>true</gsph:Spherical><gsph:Stitched>true</gsph:Stitched><gsph:StitchingSoftware>Smart ADS Neural</gsph:StitchingSoftware><gsph:ProjectionType>equirectangular</gsph:ProjectionType></rdf:SphericalVideo>`;
  const xmlBytes = new TextEncoder().encode(xml);
  
  // UUID for Spherical Video V2: ffcc8263-f855-4a93-8814-587a02521fdd
  const uuid = new Uint8Array([
    0xff, 0xcc, 0x82, 0x63, 0xf8, 0x55, 0x4a, 0x93,
    0x88, 0x14, 0x58, 0x7a, 0x02, 0x52, 0x1f, 0xdd
  ]);

  const uuidBoxSize = 4 + 4 + 16 + xmlBytes.length; // size(4) + type(4) + uuid(16) + xml
  const uuidBox = new Uint8Array(uuidBoxSize);
  
  const dataview = new DataView(uuidBox.buffer);
  dataview.setUint32(0, uuidBoxSize, false); // size
  uuidBox.set([0x75, 0x75, 0x69, 0x64], 4); // type = 'uuid'
  uuidBox.set(uuid, 8);
  uuidBox.set(xmlBytes, 24);

  // Append top-level UUID box to end
  const newBytes = new Uint8Array(bytes.length + uuidBoxSize);
  newBytes.set(bytes, 0);
  newBytes.set(uuidBox, bytes.length);

  const finalBlob = new Blob([newBytes], { type: 'video/mp4' });
  return URL.createObjectURL(finalBlob);
}

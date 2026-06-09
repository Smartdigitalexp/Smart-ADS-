export function injectGPanoToJPEG(base64DataUrl: string, width: number = 4096, height: number = 2048): string {
  if (!base64DataUrl.startsWith('data:image/jpeg;base64,')) {
    return base64DataUrl; // Only process JPEGs
  }
  
  const b64Data = base64DataUrl.split(',')[1];
  const binaryString = atob(b64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create the XMP GPano XML payload
  const xmpData = `<?xpacket begin="ï»¿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"
      GPano:UsePanoramaViewer="True"
      GPano:ProjectionType="equirectangular"
      GPano:PoseHeadingDegrees="0.0"
      GPano:CroppedAreaLeftPixels="0"
      GPano:CroppedAreaTopPixels="0"
      GPano:CroppedAreaImageWidthPixels="${width}"
      GPano:CroppedAreaImageHeightPixels="${height}"
      GPano:FullPanoWidthPixels="${width}"
      GPano:FullPanoHeightPixels="${height}"/>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpBytes = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0" + xmpData);
  const app1Header = new Uint8Array([0xFF, 0xE1]);
  const length = xmpBytes.length + 2;
  const lengthBytes = new Uint8Array([(length >> 8) & 0xFF, length & 0xFF]);

  // Insert immediately after SOI (FF D8) and any potential APP0 segment
  let insertPos = 2;
  if (bytes[2] === 0xFF && bytes[3] === 0xE0) {
    // Skip APP0
    const app0Len = (bytes[4] << 8) | bytes[5];
    insertPos = 4 + app0Len;
  }

  const newBytes = new Uint8Array(bytes.length + 2 + 2 + xmpBytes.length);
  newBytes.set(bytes.slice(0, insertPos), 0);
  newBytes.set(app1Header, insertPos);
  newBytes.set(lengthBytes, insertPos + 2);
  newBytes.set(xmpBytes, insertPos + 4);
  newBytes.set(bytes.slice(insertPos), insertPos + 4 + xmpBytes.length);

  // Convert chunk by chunk to avoid stack issues
  const chunkSize = 8192;
  let binaryStr = '';
  for (let i = 0; i < newBytes.length; i += chunkSize) {
    const chunk = newBytes.slice(i, i + chunkSize);
    binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return 'data:image/jpeg;base64,' + btoa(binaryStr);
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

  const chunkSize = 8192;
  let binaryStr = '';
  for (let i = 0; i < newBytes.length; i += chunkSize) {
    const chunk = newBytes.slice(i, i + chunkSize);
    binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return 'data:video/mp4;base64,' + btoa(binaryStr);
}

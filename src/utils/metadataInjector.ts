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
 * @returns Uint8Array containing the new JPEG file with integrated 360° GPano APP1 segment.
 */
export function injectGPanoMetadata(jpegBytes: Uint8Array, width: number, height: number): Uint8Array {
  // Check SOI marker (Start of Image = FF D8)
  if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    console.warn("JPEG SOI marker (FFD8) missing. Base image might not be a standard JPEG.");
    return jpegBytes;
  }

  // Construct the standardized Google/Meta GPano XMP Metadata
  const xmpString = `<?xpacket begin="?" id="W5M0MpCehiHzreSzNTczkc9d"?>
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
   <GPano:CaptureSoftware>SmartAds 360 AI Platform</GPano:CaptureSoftware>
   <GPano:SourcePhotosCount>1</GPano:SourcePhotosCount>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;

  const encoder = new TextEncoder();
  const xmpBytes = encoder.encode(xmpString);

  // Standard APP1 namespace for XMP payload is "http://ns.adobe.com/xap/1.0/\0"
  const xmpHeader = encoder.encode("http://ns.adobe.com/xap/1.0/\0");

  // APP1 Segment payload length: 
  // 2 bytes for length descriptor + XMP URI length (29) + XMP XML length
  const payloadLength = 2 + xmpHeader.length + xmpBytes.length;

  if (payloadLength > 65535) {
    console.warn("XMP block is too large to fit in a single JPEG APP1 segment.");
    return jpegBytes;
  }

  // Construct APP1 segment [FF E1] [LenHigh] [LenLow] [Payload...]
  const app1Segment = new Uint8Array(2 + payloadLength);
  app1Segment[0] = 0xFF;
  app1Segment[1] = 0xE1; // APP1 Segment marker
  app1Segment[2] = (payloadLength >> 8) & 0xFF;
  app1Segment[3] = payloadLength & 0xFF;

  // Set standard XMP header
  app1Segment.set(xmpHeader, 4);

  // Set XMP XML body
  app1Segment.set(xmpBytes, 4 + xmpHeader.length);

  // Inject APP1 segment directly after SOI (index 2)
  const result = new Uint8Array(jpegBytes.length + app1Segment.length);
  result.set(jpegBytes.subarray(0, 2), 0); // Copy SOI
  result.set(app1Segment, 2); // Copy XMP APP1
  result.set(jpegBytes.subarray(2), 2 + app1Segment.length); // Copy rest of JPEG bytes

  return result;
}

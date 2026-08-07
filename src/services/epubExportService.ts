/**
 * ePub Export Service
 *
 * Packages family book content as an ePub file using JSZip.
 */

import JSZip from 'jszip';

interface EpubChapter {
  title: string;
  content: string; // HTML content
}

export async function generateEpub(
  title: string,
  author: string,
  chapters: EpubChapter[]
): Promise<Blob> {
  const zip = new JSZip();

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.file('META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // Generate chapter files
  const manifestItems: string[] = [];
  const spineItems: string[] = [];

  chapters.forEach((ch, i) => {
    const id = `chapter${i + 1}`;
    const filename = `${id}.xhtml`;
    zip.file(`OEBPS/${filename}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(ch.title)}</title>
<style>body { font-family: serif; margin: 1em; } h1 { color: #8B4513; }</style>
</head>
<body>
<h1>${escapeXml(ch.title)}</h1>
${ch.content}
</body>
</html>`
    );
    manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
  });

  // Table of Contents (NCX)
  const navPoints = chapters.map((ch, i) =>
    `<navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="chapter${i + 1}.xhtml"/>
    </navPoint>`
  ).join('\n');

  zip.file('OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="family-tree-book"/></head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>${navPoints}</navMap>
</ncx>`
  );

  // content.opf
  zip.file('OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">family-tree-book</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`
  );

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadEpub(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

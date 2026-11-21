/**
 * CapeSecure Pure TypeScript Native PDF Builder
 * Generates genuine, standard-compliant PDF-1.4 binary documents without external dependencies.
 */

export class PDFBuilder {
  private objects: string[] = []
  private pages: { content: string[] }[] = []
  private currentPage = 0
  private pageWidth = 595.28 // A4 width in points
  private pageHeight = 841.89 // A4 height in points

  constructor() {
    this.addPage()
  }

  public addPage() {
    this.pages.push({ content: [] })
    this.currentPage = this.pages.length - 1
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ') // replace unsupported non-ascii with space
  }

  // Draw filled rectangle
  public fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
    const pdfY = this.pageHeight - y - h
    this.pages[this.currentPage].content.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    )
  }

  // Draw stroke rectangle
  public strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, lineWidth = 1) {
    const pdfY = this.pageHeight - y - h
    this.pages[this.currentPage].content.push(
      `${lineWidth} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`
    )
  }

  // Draw line
  public line(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, lineWidth = 1) {
    const pdfY1 = this.pageHeight - y1
    const pdfY2 = this.pageHeight - y2
    this.pages[this.currentPage].content.push(
      `${lineWidth} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(2)} ${pdfY1.toFixed(2)} m ${x2.toFixed(2)} ${pdfY2.toFixed(2)} l S`
    )
  }

  // Draw text
  public drawText(
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number
      bold?: boolean
      r?: number
      g?: number
      b?: number
      align?: 'left' | 'right' | 'center'
      maxWidth?: number
    } = {}
  ) {
    const {
      fontSize = 10,
      bold = false,
      r = 0.1,
      g = 0.1,
      b = 0.1,
      align = 'left',
    } = options

    const font = bold ? '/F2' : '/F1'
    const pdfY = this.pageHeight - y - fontSize
    const escaped = this.escapeText(text)

    // Rough text width estimation (0.55 * fontSize * chars)
    let finalX = x
    const approxWidth = text.length * fontSize * 0.52
    if (align === 'right') {
      finalX = x - approxWidth
    } else if (align === 'center') {
      finalX = x - approxWidth / 2
    }

    this.pages[this.currentPage].content.push(
      `BT ${font} ${fontSize} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${finalX.toFixed(2)} ${pdfY.toFixed(2)} Tm (${escaped}) Tj ET`
    )
  }

  // Draw multiline paragraph
  public drawParagraph(
    text: string,
    x: number,
    y: number,
    width: number,
    options: { fontSize?: number; lineHeight?: number; bold?: boolean; r?: number; g?: number; b?: number } = {}
  ): number {
    const { fontSize = 10, lineHeight = 14, bold = false, r = 0.1, g = 0.1, b = 0.1 } = options
    const words = text.split(' ')
    let currentLine = ''
    let currentY = y
    const charsPerLine = Math.floor(width / (fontSize * 0.52))

    for (const word of words) {
      if ((currentLine + word).length > charsPerLine && currentLine.length > 0) {
        this.drawText(currentLine.trim(), x, currentY, { fontSize, bold, r, g, b })
        currentLine = word + ' '
        currentY += lineHeight
      } else {
        currentLine += word + ' '
      }
    }

    if (currentLine.trim().length > 0) {
      this.drawText(currentLine.trim(), x, currentY, { fontSize, bold, r, g, b })
      currentY += lineHeight
    }

    return currentY
  }

  // Compile to Uint8Array PDF binary
  public build(): Uint8Array {
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
    const offsets: number[] = []

    const totalPages = this.pages.length

    // 1: Catalog
    // 2: Pages
    // 3..(2+totalPages): Page objects
    // (3+totalPages)..(2+2*totalPages): Content streams
    // Font 1 (Helvetica)
    // Font 2 (Helvetica-Bold)

    const font1ObjNum = 3 + totalPages * 2
    const font2ObjNum = font1ObjNum + 1

    const pageObjNums: number[] = []
    const contentObjNums: number[] = []

    for (let i = 0; i < totalPages; i++) {
      pageObjNums.push(3 + i)
      contentObjNums.push(3 + totalPages + i)
    }

    // 1. Catalog Object
    offsets.push(out.length)
    out += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`

    // 2. Pages Object
    offsets.push(out.length)
    const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ')
    out += `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj\n`

    // Page Objects
    for (let i = 0; i < totalPages; i++) {
      offsets.push(out.length)
      const pageNum = pageObjNums[i]
      const contentNum = contentObjNums[i]
      out += `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] /Contents ${contentNum} 0 R /Resources << /Font << /F1 ${font1ObjNum} 0 R /F2 ${font2ObjNum} 0 R >> >> >>\nendobj\n`
    }

    // Content Stream Objects
    for (let i = 0; i < totalPages; i++) {
      offsets.push(out.length)
      const contentNum = contentObjNums[i]
      const streamData = this.pages[i].content.join('\n')
      out += `${contentNum} 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj\n`
    }

    // Font 1: Helvetica
    offsets.push(out.length)
    out += `${font1ObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`

    // Font 2: Helvetica-Bold
    offsets.push(out.length)
    out += `${font2ObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`

    // xref table
    const startXref = out.length
    const totalObjs = font2ObjNum + 1
    out += `xref\n0 ${totalObjs}\n`
    out += `0000000000 65535 f \n`
    for (const offset of offsets) {
      out += `${String(offset).padStart(10, '0')} 00000 n \n`
    }

    // Trailer
    out += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`

    // Convert string to bytes
    const buffer = new Uint8Array(out.length)
    for (let i = 0; i < out.length; i++) {
      buffer[i] = out.charCodeAt(i) & 0xff
    }

    return buffer
  }

  // Trigger real browser download of .pdf file
  public download(filename: string) {
    const bytes = this.build()
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

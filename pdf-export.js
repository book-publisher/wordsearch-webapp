const INCH_TO_PT = 72;

async function generatePDF(puzzlesData, trimSizeStr, solutionsPerPage) {
    const { jsPDF } = window.jspdf;
    
    // Parse trim size
    let widthIn, heightIn;
    if (trimSizeStr === '8.5x11') { widthIn = 8.5; heightIn = 11; }
    else if (trimSizeStr === '6x9') { widthIn = 6; heightIn = 9; }
    else if (trimSizeStr === '8.5x8.5') { widthIn = 8.5; heightIn = 8.5; }
    else if (trimSizeStr === 'A4') { widthIn = 8.27; heightIn = 11.69; }
    else { widthIn = 8.5; heightIn = 11; }

    const pdf = new jsPDF({
        orientation: widthIn > heightIn ? 'landscape' : 'portrait',
        unit: 'in',
        format: [widthIn, heightIn]
    });

    const scale = 3; // Increased scale for higher resolution
    const margin = 0.5; // 0.5 inch margins

    // Helper to render a DOM element to the PDF with high quality
    async function renderPageToPDF(element, isFirstPage) {
        if (!isFirstPage) {
            pdf.addPage([widthIn, heightIn], widthIn > heightIn ? 'landscape' : 'portrait');
        }
        
        // Use high DPI for better quality
        const canvas = await html2canvas(element, { 
            scale: scale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Calculate image dimensions to fit on page with margins
        const pageWidthNoMargin = widthIn - (2 * margin);
        const pageHeightNoMargin = heightIn - (2 * margin);
        
        const imgWidth = pageWidthNoMargin;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight, pageHeightNoMargin));
    }

    // 1. Render all Puzzle Pages
    for (let i = 0; i < puzzlesData.length; i++) {
        const domElement = renderPuzzleToDOM(puzzlesData[i], i + 1, false);
        domElement.style.backgroundColor = '#ffffff';
        document.body.appendChild(domElement);
        await renderPageToPDF(domElement, i === 0);
        document.body.removeChild(domElement);
    }

    // 2. Render Solution Pages
    const solutions = puzzlesData.map((data, i) => {
        return renderPuzzleToDOM(data, i + 1, true, true); // small mode
    });

    let solIndex = 0;
    let solPageNum = 1;
    
    while (solIndex < solutions.length) {
        const pageDom = document.createElement('div');
        pageDom.className = 'page solution-page';
        pageDom.style.width = `${widthIn}in`;
        pageDom.style.height = `${heightIn}in`;
        pageDom.style.backgroundColor = '#ffffff';
        
        const header = document.createElement('div');
        header.className = 'solution-page-header';
        header.textContent = `Solutions - Page ${solPageNum}`;
        header.style.textAlign = 'center';
        header.style.fontSize = '16px';
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '15px';
        header.style.padding = '10px';
        pageDom.appendChild(header);

        const gridDom = document.createElement('div');
        gridDom.className = 'solutions-grid';
        gridDom.style.display = 'flex';
        gridDom.style.flexWrap = 'wrap';
        gridDom.style.justifyContent = 'center';
        gridDom.style.gap = '15px';
        gridDom.style.padding = '10px';
        
        pageDom.appendChild(gridDom);
        
        // Add solutions to this page
        for (let j = 0; j < solutionsPerPage && solIndex < solutions.length; j++) {
            const solWrapper = document.createElement('div');
            solWrapper.style.display = 'flex';
            solWrapper.style.flexDirection = 'column';
            solWrapper.style.alignItems = 'center';
            solWrapper.style.justifyContent = 'center';
            
            // Add puzzle number label
            const label = document.createElement('div');
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';
            label.style.marginBottom = '5px';
            label.textContent = `Puzzle ${solIndex + 1}`;
            solWrapper.appendChild(label);
            
            // Add grid
            solWrapper.appendChild(solutions[solIndex]);
            
            gridDom.appendChild(solWrapper);
            solIndex++;
        }

        document.body.appendChild(pageDom);
        await renderPageToPDF(pageDom, false);
        document.body.removeChild(pageDom);
        
        solPageNum++;
    }

    pdf.save('WordSearch_PuzzleBook.pdf');
}

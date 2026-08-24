let currentPuzzlesData = [];

function getSettings() {
    const preset = document.getElementById('grid-size-preset').value;
    let cols = 15, rows = 15;
    if (preset === '10x10') { cols = 10; rows = 10; }
    else if (preset === '15x15') { cols = 15; rows = 15; }
    else if (preset === '18x18') { cols = 18; rows = 18; }
    else if (preset === '20x20') { cols = 20; rows = 20; }
    else {
        cols = parseInt(document.getElementById('grid-cols').value) || 15;
        rows = parseInt(document.getElementById('grid-rows').value) || 15;
    }

    const directions = Array.from(document.querySelectorAll('.direction-toggle:checked')).map(cb => cb.value);
    
    return {
        title: document.getElementById('puzzle-title').value || "Word Search",
        words: document.getElementById('word-list').value.split('\n').map(w => w.trim()).filter(w => w),
        cols, rows,
        directions,
        allowBackwards: document.getElementById('allow-backwards').checked,
        trimSize: document.getElementById('trim-size').value,
        titlePlacement: document.getElementById('title-placement').value,
        cluePlacement: document.getElementById('clue-placement').value,
        clueCols: parseInt(document.getElementById('clue-cols').value) || 3,
        clueRows: parseInt(document.getElementById('clue-rows').value) || 5,
        clueSpacing: parseInt(document.getElementById('clue-spacing').value) || 10,
        fontTitle: document.getElementById('font-title').value,
        fontClues: document.getElementById('font-clues').value,
        fontGrid: document.getElementById('font-grid').value,
        bgOpacity: document.getElementById('bg-opacity').value / 100,
        showBorder: document.getElementById('grid-border').checked,
        wordsPerPuzzle: parseInt(document.getElementById('words-per-puzzle').value) || 15,
        puzzleCount: parseInt(document.getElementById('puzzle-count').value) || 1,
        solutionsPerPage: parseInt(document.getElementById('solutions-per-page').value) || 6
    };
}

// Create an SVG-based grid for better rendering quality
function createGridSVG(puzzleData, isSolution = false, isSmallMode = false) {
    const s = puzzleData.settings;
    const cols = s.cols;
    const rows = s.rows;
    
    // Cell size in viewport units
    const cellSize = isSmallMode ? 20 : 30;
    const viewBoxWidth = cols * cellSize;
    const viewBoxHeight = rows * cellSize;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('class', 'word-grid-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Draw cells and letters
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;
            
            // Draw cell border
            if (s.showBorder) {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', cellSize);
                rect.setAttribute('height', cellSize);
                rect.setAttribute('fill', 'none');
                rect.setAttribute('stroke', '#333');
                rect.setAttribute('stroke-width', '1');
                svg.appendChild(rect);
            }
            
            // Draw letter
            const letter = puzzleData.result.grid[r][c];
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + cellSize / 2);
            text.setAttribute('y', y + cellSize / 2);
            text.setAttribute('class', 'solution-svg-text');
            text.setAttribute('font-size', isSmallMode ? '14px' : '20px');
            text.setAttribute('font-family', `"${s.fontGrid}", monospace`);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.textContent = letter;
            svg.appendChild(text);
        }
    }
    
    // Draw solution highlights (only if this is a solution)
    if (isSolution && puzzleData.result.placedWords) {
        puzzleData.result.placedWords.forEach(pw => {
            const path = pw.path;
            if (path.length < 1) return;
            
            const start = path[0];
            const end = path[path.length - 1];
            
            const r1 = start[0], c1 = start[1];
            const r2 = end[0], c2 = end[1];
            
            // Calculate line coordinates in SVG space
            const x1 = c1 * cellSize + cellSize / 2;
            const y1 = r1 * cellSize + cellSize / 2;
            const x2 = c2 * cellSize + cellSize / 2;
            const y2 = r2 * cellSize + cellSize / 2;
            
            // Draw rounded rectangle around word
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            
            const padding = cellSize * 0.15;
            const width = maxX - minX + cellSize * 0.3;
            const height = maxY - minY + cellSize * 0.3;
            
            rect.setAttribute('x', minX - width / 2 + cellSize / 2);
            rect.setAttribute('y', minY - height / 2 + cellSize / 2);
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            rect.setAttribute('rx', cellSize * 0.2);
            rect.setAttribute('ry', cellSize * 0.2);
            
            const strokeWidth = isSmallMode ? '0.8' : '1.5';
            rect.setAttribute('class', `solution-highlight ${isSmallMode ? 'small' : ''}`);
            rect.setAttribute('stroke-width', strokeWidth);
            
            // Calculate angle for rotation
            if (r1 !== r2 || c1 !== c2) {
                const dx = x2 - x1;
                const dy = y2 - y1;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                rect.setAttribute('transform', `rotate(${angle}, ${(x1 + x2) / 2}, ${(y1 + y2) / 2})`);
            }
            
            svg.appendChild(rect);
        });
    }
    
    return svg;
}

function renderPuzzleToDOM(puzzleData, puzzleNum, isSolution = false, isSmallMode = false) {
    const s = puzzleData.settings;
    const page = document.createElement('div');
    page.className = 'page';
    
    if (isSmallMode) {
        page.className = 'solution-mini-wrapper';
    } else {
        // Set dimensions based on trim size
        let widthIn = 8.5, heightIn = 11;
        if (s.trimSize === '6x9') { widthIn = 6; heightIn = 9; }
        if (s.trimSize === '8.5x8.5') { widthIn = 8.5; heightIn = 8.5; }
        if (s.trimSize === 'A4') { widthIn = 8.27; heightIn = 11.69; }
        page.style.setProperty('--page-width', `${widthIn}in`);
        page.style.setProperty('--page-height', `${heightIn}in`);
    }

    // Title
    const header = document.createElement('div');
    header.className = 'page-header';
    const title = document.createElement('h1');
    title.className = `page-title title-${s.titlePlacement}`;
    title.style.fontFamily = `"${s.fontTitle}", sans-serif`;
    title.textContent = isSmallMode ? `Puzzle ${puzzleNum}` : `${s.title} #${puzzleNum}`;
    
    if (isSmallMode) {
        title.className = 'solution-mini-title';
    }
    
    header.appendChild(title);
    if (!isSmallMode || (isSmallMode && title.textContent)) {
         page.appendChild(header);
    }

    // Body layout
    const body = document.createElement('div');
    body.className = `page-body layout-${s.cluePlacement}`;

    // Grid container
    const puzzleContainer = document.createElement('div');
    puzzleContainer.className = 'puzzle-container';
    
    // Create SVG-based grid
    const gridSvg = createGridSVG(puzzleData, isSolution, isSmallMode);
    puzzleContainer.appendChild(gridSvg);
    
    body.appendChild(puzzleContainer);

    // Clues (only if not small mode)
    if (!isSmallMode) {
        const cluesContainer = document.createElement('div');
        cluesContainer.className = 'clues-container';
        
        const cluesList = document.createElement('ul');
        cluesList.className = 'clues-list';
        cluesList.style.fontFamily = `"${s.fontClues}", sans-serif`;
        
        // Dynamic layout for clues using flex
        if (s.cluePlacement === 'bottom') {
            cluesContainer.style.marginTop = `${s.clueSpacing}px`;
        }

        const sortedPlaced = puzzleData.result.placedWords.map(p => p.word).sort();
        const colPercent = 100 / s.clueCols;
        
        sortedPlaced.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            if (isSolution) li.classList.add('found');
            
            li.style.width = `calc(${colPercent}% - ${s.clueSpacing}px)`;
            li.style.marginRight = `${s.clueSpacing}px`;
            li.style.marginBottom = `${s.clueSpacing}px`;
            
            cluesList.appendChild(li);
        });

        cluesContainer.appendChild(cluesList);
        body.appendChild(cluesContainer);
    }

    page.appendChild(body);
    
    // Background overlay
    if (s.bgOpacity > 0 && !isSmallMode) {
        const bg = document.createElement('div');
        bg.className = 'bg-overlay';
        bg.style.backgroundColor = 'rgba(0,0,0,' + s.bgOpacity + ')';
        page.appendChild(bg);
    }

    return page;
}

function generateBatch() {
    const s = getSettings();
    currentPuzzlesData = [];

    const errorMsg = document.getElementById('error-message');
    errorMsg.style.display = 'none';
    
    // Check word lengths
    const maxDimension = Math.max(s.cols, s.rows);
    const oversized = s.words.some(w => w.length > maxDimension);
    if (oversized) {
        errorMsg.textContent = "Warning: Some words are longer than the grid size and may not fit!";
        errorMsg.style.display = 'block';
    }

    let wordsPerPuzzle = s.wordsPerPuzzle;
    
    for (let i = 0; i < s.puzzleCount; i++) {
        let puzzleWords = [];
        if (s.words.length > 0) {
            for (let j = 0; j < wordsPerPuzzle; j++) {
                const wordIndex = (i * wordsPerPuzzle + j) % s.words.length;
                puzzleWords.push(s.words[wordIndex]);
            }
        }

        const genConfig = {
            rows: s.rows,
            cols: s.cols,
            words: puzzleWords,
            directions: s.directions,
            allowBackwards: s.allowBackwards
        };
        const generator = new WordSearchGenerator(genConfig);
        const result = generator.generate();
        
        currentPuzzlesData.push({
            settings: s,
            result: result
        });
    }

    updatePreview();
}

function updatePreview() {
    const canvas = document.getElementById('preview-canvas');
    canvas.innerHTML = '';
    
    if (currentPuzzlesData.length === 0) return;

    // Show only the first puzzle and its solution in the live preview
    const firstPuzzle = currentPuzzlesData[0];
    
    const puzzleDom = renderPuzzleToDOM(firstPuzzle, 1, false);
    const solutionDom = renderPuzzleToDOM(firstPuzzle, 1, true);
    
    canvas.appendChild(puzzleDom);
    canvas.appendChild(solutionDom);
}

// Event Listeners
document.getElementById('generate-btn').addEventListener('click', generateBatch);

document.getElementById('export-pdf-btn').addEventListener('click', async () => {
    if (currentPuzzlesData.length === 0) {
        generateBatch();
    }
    const btn = document.getElementById('export-pdf-btn');
    const oldText = btn.textContent;
    btn.textContent = 'Generating PDF... Please wait';
    btn.disabled = true;
    
    try {
        const s = getSettings();
        await generatePDF(currentPuzzlesData, s.trimSize, s.solutionsPerPage);
    } catch (err) {
        console.error(err);
        alert("Error generating PDF. See console.");
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
});

// Settings interactions
document.getElementById('grid-size-preset').addEventListener('change', (e) => {
    const custom = document.getElementById('custom-grid-size');
    if (e.target.value === 'custom') {
        custom.style.display = 'flex';
    } else {
        custom.style.display = 'none';
    }
});

document.getElementById('shuffle-words').addEventListener('click', () => {
    const ta = document.getElementById('word-list');
    const words = ta.value.split('\n').filter(w => w.trim());
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    ta.value = words.join('\n');
});

// CSV Upload logic
document.getElementById('csv-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        const text = ev.target.result;
        // Basic CSV parsing: split by newlines, take first column, ignore empty
        const words = text.split(/\r?\n/)
            .map(row => row.split(',')[0].trim())
            .filter(w => w.length > 0);
            
        if (words.length > 0) {
            document.getElementById('word-list').value = words.join('\n');
            alert(`Loaded ${words.length} words from CSV.`);
        }
    };
    reader.readAsText(file);
});

// Initial generation
window.addEventListener('settingsChanged', generateBatch);
setTimeout(generateBatch, 500); // give fonts a moment to load

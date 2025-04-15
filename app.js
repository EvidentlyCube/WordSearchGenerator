let WIDTH = 1;
let HEIGHT = 1;
let WORDS = [];
let SECRET = [];
let SECRET_MODE = 'fill-once';
let CELL_EDGE = 32;
let BORDER_OFFSET_MULTIPLIER = 0.125;
let FONT_SIZE = 28;
let FONT_FAMILY = "Arial";
let FONT_COLOR = "#000000";
let BORDER_WIDTH = 1;
let BORDER_COLOR = "#EEEEEE";
let LAST_WIDTH = null;
let LAST_HEIGHT = null;
let LAST_CHARACTERS_ARRAY = null;
let LAST_WORDS = null;
let AUTO_REGEN = false;

let regenerateRunIndex = 0;
const regenerateActiveRuns = [];

document.addEventListener('paste', e => {
    if (e.target.id === 'export-import') {
        const data = e.clipboardData.getData('text');
        try {
            const parsedData = JSON.parse(data);
            if (parsedData && typeof parsedData === 'object') {
                loadSavedData(parsedData);
                regenerate();
                refreshCssVariables();
            }

        } catch (e) {
            // Silently ignore
        }
    }
});
document.addEventListener('change', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        if (e.target.id === 'font-dropdown') {
            document.querySelector('#font-family').value = e.target.value;
        } else if (e.target.id === 'font-family') {
            document.querySelector('#font-dropdown').value = e.target.value;
        }

        readForms();
        refreshCssVariables();

        if (e.target.getAttribute('data-no-regen') === null) {
            onDirty();
        } else {
            refreshTable();
        }
    }
});

loadSavedData();
regenerate();
refreshCssVariables();

function onDirty() {
    if (AUTO_REGEN) {
        regenerate();
    } else {
        regenerateActiveRuns.length = 0;
        document.querySelector('#regenerate-notice').classList.add('visible');
    }
}

function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

function pauseWord(element) {
    const parent = element.parentElement;

    parent.classList.toggle('disabled');

    readForms();
    onDirty();
}

function deleteAllWords() {
    for (const element of document.querySelectorAll('.word-row')) {
        deleteWord(element);
    }
}

function deleteWord(element, fromInput) {
    const wordRow = element.classList.contains('word-row')
        ? element
        : element.parentElement;

    if (document.querySelectorAll('.word-row').length > 1) {
        wordRow.remove();
    } else {
        clearWordRow(wordRow);
    }

    if (fromInput) {
        readForms();
        onDirty();
    }
}

function addWord(text, directions, isDisabled, repeats) {
    const newWord = document.querySelector('.word-row').cloneNode(true);
    clearWordRow(newWord);
    const allWords = document.querySelectorAll('.word-row');
    allWords[allWords.length - 1].after(newWord);

    if (text) {
        newWord.querySelector('input.word').value = text;
    }
    if (directions) {
        newWord.querySelector('select').value = directions;
    }
    if (repeats) {
        newWord.querySelector('input.repeats').value = String(repeats)
    }
    if (isDisabled) {
        newWord.classList.add('disabled');
    }
}

function clearWordRow(element) {
    element.classList.remove('disabled');
    element.querySelector('input.word').value = '';
    element.querySelector('select').value = element.querySelector('select option:first-child').value;
}

function refreshCssVariables() {
    document.body.style.setProperty('--cell-edge', toPx(CELL_EDGE));
    document.body.style.setProperty('--cell-edge-raw', CELL_EDGE);
    document.body.style.setProperty('--cell-font-size', toPx(FONT_SIZE));
    document.body.style.setProperty('--cell-border-offset-multiplier', `${BORDER_OFFSET_MULTIPLIER}`);
    document.body.style.setProperty('--font-color', FONT_COLOR);
    document.body.style.setProperty('--border-color', BORDER_COLOR);
    document.body.style.setProperty('--border-width', toPx(BORDER_WIDTH));
    document.body.style.setProperty('--border-width-raw', BORDER_WIDTH);
    document.body.style.setProperty('--font-family', FONT_FAMILY);
}

function readForms() {
    WIDTH = parseInt(document.querySelector('#width').value) || 1;
    HEIGHT = parseInt(document.querySelector('#height').value) || 1;
    SECRET = document.querySelector('#secret').value || '';
    SECRET_MODE = document.querySelector('#secret-mode').value || 'fill-once';
    WORDS = Array.from(document.querySelectorAll('.word-row')).map(row => ({
        text: row.querySelector('input.word').value,
        dirs: row.querySelector('select').value.split(' ').map(x => parseInt(x)),
        repeats: parseRepeats(row.querySelector('input.repeats').value),
        disabled: row.classList.contains('disabled')
    }));
    CELL_EDGE = parseInt(document.querySelector('#cell-edge').value) || 32;
    FONT_SIZE = parseInt(document.querySelector('#font-size').value) || 28;
    FONT_FAMILY = document.querySelector('#font-family').value || 'Arial';
    FONT_COLOR = document.querySelector('#font-color').value || '#000000';
    BORDER_WIDTH = parseInt(document.querySelector('#border-width').value) ?? 1;
    BORDER_COLOR = document.querySelector('#border-color').value ?? '#EEEEEE';
    AUTO_REGEN = document.querySelector('#auto-regen').checked || false;

    localStorage.setItem('save', JSON.stringify({
        width: WIDTH,
        height: HEIGHT,
        cellEdge: CELL_EDGE,
        borderWidth: BORDER_WIDTH,
        borderColor: BORDER_COLOR,
        fontSize: FONT_SIZE,
        fontFamily: FONT_FAMILY,
        fontColor: FONT_COLOR,
        autoRegen: AUTO_REGEN,
        secret: SECRET,
        secretMode: SECRET_MODE,
        words: WORDS
    }));

    document.querySelector('#export-import').value = localStorage.save;
}

function loadSavedData(savedData) {
    const data = savedData ?? getSavedData();

    document.querySelector('#width').value = data.width || 12;
    document.querySelector('#height').value = data.height || 12;
    document.querySelector('#cell-edge').value = data.cellEdge || 32;
    document.querySelector('#font-size').value = data.fontSize || 32;
    document.querySelector('#font-dropdown').value = data.fontFamily || 'Arial';
    document.querySelector('#font-family').value = data.fontFamily || 'Arial';
    document.querySelector('#border-width').value = data.borderWidth || 1;
    document.querySelector('#border-color').value = data.borderColor || '#EEEEEE';
    document.querySelector('#font-color').value = data.fontColor || '#000000';
    document.querySelector('#auto-regen').checked = data.autoRegen || false;
    document.querySelector('#secret').value = data.secret || "";
    document.querySelector('#secret-mode').value = data.secretMode || "fill-once";

    deleteAllWords();
    data.words.forEach(({ text, dirs, disabled, repeats }) => addWord(text, dirs.join(' '), disabled, repeats));
    deleteWord(document.querySelector('.word-row'));
    readForms();
}

function getSavedData() {
    const defaultData = {
        width: 10,
        height: 10,
        cellEdge: 48,
        fontSize: 26,
        fontFamily: 'Courier New',
        fontColor: '#000000',
        borderWidth: 1,
        borderColor: '#000000',
        autoRegen: true,
        secret: "ToBeOrNotToBeThisIsTheQuestion",
        secretMode: "fill-once",
        words: [
            { text: "Abbot", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Celia", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Cornelius", dirs: [0, 2, 6, 8], repeats: 1, disabled: true },
            { text: "Grey", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Hamlet", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Horatio", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Juliet", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Lear", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Macduff", dirs: [5, 7, 8], repeats: 1, disabled: true },
            { text: "Maria", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Miranda", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Mopso", dirs: [5, 7, 8], repeats: 1, disabled: true },
            { text: "Oberon", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Othello", dirs: [5, 7, 8], repeats: 1, disabled: true },
            { text: "Phebe", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Puck", dirs: [5, 7, 8], repeats: 1, disabled: false },
            { text: "Silvia", dirs: [0, 2, 6, 8], repeats: 1, disabled: false },
            { text: "Valentine", dirs: [5, 7, 8], repeats: 1, disabled: true },
        ]
    }

    try {
        return {
            ...defaultData,
            ...JSON.parse(localStorage.getItem("save"))
        };
    } catch (e) {
        return defaultData;
    }
}

function hideNotice() {
    document.querySelector('#regenerate-notice').classList.remove('visible');
}

async function regenerate() {
    hideNotice();

    const width = WIDTH;
    const height = HEIGHT;
    regenerateActiveRuns.length = 0;

    const index = regenerateRunIndex++;
    regenerateActiveRuns.push(index);

    const inputWords = WORDS
        .filter(word => !word.disabled)
        .map(word => ({
            text: word.text,
            repeats: word.repeats,
            dirs: word.dirs.concat()
        }))
        .sort((l, r) => r.text.length - l.text.length);

    const isCancelled = () => {
        return regenerateActiveRuns.indexOf(index)
    };
    let allowGeneratingTable = true;

    const interval = setInterval(() => {
        allowGeneratingTable = true;
    }, 32);

    const { charactersArray, words, success } = await Regenerator.run(
        WIDTH,
        HEIGHT,
        inputWords,
        {
            isCancelled,
            secret: SECRET,
            secretMode: SECRET_MODE,
            onProgress: (width, height, words, charactersArray) => {
                if (allowGeneratingTable && !isCancelled()) {
                    allowGeneratingTable = false;
                    generateTable(width, height, words, charactersArray);
                    updateStatus("Generating...");
                }
            },
            onError: (text) => {
                updateStatus(`ERROR: ${text}`);
            }
        }
    );

    clearInterval(interval);
    if (!isCancelled()) {
        LAST_CHARACTERS_ARRAY = charactersArray;
        LAST_WORDS = words;
        LAST_WIDTH = width;
        LAST_HEIGHT = height;

        if (success) {
            updateStatus("");
        }
        refreshTable();
    }
}

function refreshTable() {
    if (LAST_WIDTH && LAST_HEIGHT && LAST_WORDS && LAST_CHARACTERS_ARRAY) {
        generateTable(LAST_WIDTH, LAST_HEIGHT, LAST_WORDS, LAST_CHARACTERS_ARRAY);
    }
}

/**
 * @param {number} width
 * @param {number} height
 * @param {WordDefinition[]} words
 * @param {string[][]} charactersArray
 */
function generateTable(width, height, words, charactersArray) {
    const table = document.querySelector('#words-table');
    table.innerHTML = '';

    for (let y = 0; y < height; y++) {
        const row = document.createElement('div');
        row.classList.add('row');
        table.appendChild(row);
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.classList.add(`pos-${x}-${y}`)
            row.appendChild(cell);

            cell.innerText = charactersArray[x][y];
        }
    }

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (word.finalDir.length === 0) {
            continue;
        }

        for (let finalPosIndex = 0; finalPosIndex < word.finalDir.length; finalPosIndex++) {
            const finalX = word.finalX[finalPosIndex];
            const finalY = word.finalY[finalPosIndex];
            const finalDir = word.finalDir[finalPosIndex];
            const startCell = document.querySelector(`.pos-${finalX}-${finalY}`);
            startCell.classList.add(`word`);

            const border = document.createElement('span');
            border.classList.add('word-border');
            border.classList.add(`dir-${finalDir}`);
            if (Regenerator.isDiagonalDir(finalDir)) {
                border.classList.add('diagonal');
            }
            border.style.setProperty('--cells', word.text.length);
            startCell.append(border);

            const dx = Regenerator.DIR_DX[finalDir];
            const dy = Regenerator.DIR_DY[finalDir];
            for (let j = 0; j < word.text.length; j++) {
                const x = finalX + j * dx;
                const y = finalY + j * dy;

                const cell = document.querySelector(`.pos-${x}-${y}`);
                cell.classList.add(`color-${i % 6}`);
                cell.classList.add(`word`);
                cell.classList.add(`word-${i}`);
                cell.classList.add(`word-${i}-${finalPosIndex}`);
            }
        }
    }
}

function parseRepeats(string) {
    const value = parseInt(string);
    if (Number.isNaN(value) || !Number.isFinite(value) || value < 1) {
        return 1;
    }

    return value;
}

function updateStatus(text) {
    const $notice = document.querySelector('#status-notice');

    if (text) {
        $notice.classList.add('visible');
        $notice.querySelector('p').textContent = text;
    } else {
        $notice.classList.remove('visible');
    }
}

function toPx(value) {
    if (value === 0) {
        return '0';
    } else {
        return `${value}px`;
    }
}
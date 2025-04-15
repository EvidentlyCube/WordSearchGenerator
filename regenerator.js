/**
 * @callback ProgressCallback
 * @param {number} width
 * @param {number} height
 * @param {WordDefinition[]} words
 * @param {string[][]} charactersArray - Characters array
 */

/**
 * @callback RegeneratorErrorCallback
 * @param {string} text - Error text
 */

/**
 * @callback IsCancelled
 * @return {boolean}
 */

/**
 * @typedef {Object} WordDefinition
 * @property {string} text Text of the word
 * @property {string} textReverse Reversed text of the word
 * @property {number} repeats How many times the word is repeated
 * @property {boolean} isPalindrome (Internal) whether the word is a palindrome
 * @property {number[]} dirs Allowed directions
 * @property {finalX} number[] Final X position
 * @property {finalY} number[] Final Y position
 * @property {finalDir} number[] Final Direction
 */

/**
 * @typedef {Object} Context
 * @property {number} width
 * @property {number} height
 * @property {string} secret
 * @property {'random'|'fill'|'fill-once'} secretMode
 * @property {number} usedSteps
 * @property {number} nextSleep
 * @property {WordDefinition[]} words
 * @property {ProgressCallback} onProgress
 * @property {RegeneratorErrorCallback} onError
 */

/**
 * @typedef {Object} OptionsInput
 * @property {string|undefined} secret
 * @property {'random'|'fill'|undefined} secretMode
 * @property {ProgressCallback|undefined} onProgress
 * @property {RegeneratorErrorCallback|undefined} onError
 * @property {IsCancelled|undefined} isCancelled
 */

const DIRS_ENUM = {
    UP_LEFT: 0,
    UP: 1,
    UP_RIGHT: 2,
    LEFT: 3,
    RIGHT: 5,
    DOWN_LEFT: 6,
    DOWN: 7,
    DOWN_RIGHT: 8,
};

const ALL_DIRS = [0, 1, 2, 3, 5, 6, 7, 8];

const DIR_DX = [
    -1, 0, 1,
    -1, 0, 1,
    -1, 0, 1
];
const DIR_DY = [
    -1, -1, -1,
    0, 0, 0,
    1, 1, 1
];
const DIR_DIAG = [
    true, false, true,
    false, false, false,
    true, false, true,
];

const Regenerator = {
    DIR_DX: DIR_DX.concat(),
    DIR_DY: DIR_DY.concat(),
    ALL_DIRS: ALL_DIRS.concat(),

    isDiagonalDir(dir) {
        return DIR_DIAG[dir];
    },

    /**
     * @param {Number} width
     * @param {Number} height
     * @param {WordDefinition[]} words
     * @param {OptionsInput} context
     */
    async run(width, height, words, optionsDef) {
        const mappedWords = words.filter(x => x.text).map(word => {
            const text = word.text.toUpperCase();
            const textReverse = text.split('').reverse().join('');
            const dirs = word.text.length === 1
                ? [DIRS_ENUM.RIGHT]
                : word.dirs;
            const isPalindrome = text === textReverse;

            return {
                text, textReverse, dirs,
                repeats: word.repeats,
                isPalindrome,
                finalX: [],
                finalY: [],
                finalDir: [],
            };
        });

        /** @type {Context} */
        const context = {
            width, height,
            words: mappedWords,
            secret: (optionsDef.secret || ' ').toUpperCase(),
            secretMode: optionsDef.secretMode || 'fill',
            nextSleep: Date.now() + 30,
            onProgress: optionsDef.onProgress || function () { },
            onError: optionsDef.onError || function () { },
            isCancelled: optionsDef.isCancelled || function () { return false; },
            usedSteps: 0
        };

        const charactersArray = Regenerator._generate2dArray(width, height, '');

        if (!Regenerator._assertNoSubstringWords(mappedWords, context)) {
            return { charactersArray, words: mappedWords, success: false };
        } else if (!Regenerator._assertEnoughSpace(mappedWords, context)) {
            return { charactersArray, words: mappedWords, success: false };
        }
        const wordToPosMap = new Map();

        for (const word of mappedWords) {
            wordToPosMap.set(word, Regenerator._generateAllowedWordPositions(width, height, word));
        }

        const success = await Regenerator._writeWords(wordToPosMap, charactersArray, context);

        return { charactersArray, words: mappedWords, success };
    },

    /**
     * @param {WordDefinition[]} words
     * @param {Context} context
     */
    _assertNoSubstringWords(words, context) {
        for (let i = 0; i < words.length; i++) {
            for (let j = i + 1; j < words.length; j++) {
                if (
                    words[i].text.indexOf(words[j].text) !== -1
                    || words[j].text.indexOf(words[i].text) !== -1
                    || words[i].textReverse.indexOf(words[j].text) !== -1
                    || words[j].textReverse.indexOf(words[i].text) !== -1
                    || words[i].text.indexOf(words[j].textReverse) !== -1
                    || words[j].text.indexOf(words[i].textReverse) !== -1
                    || words[i].textReverse.indexOf(words[j].text) !== -1
                    || words[j].textReverse.indexOf(words[i].text) !== -1
                ) {
                    context.onError(`No full word can be same or a part of another word: '${words[i].text}' and '${words[j].text}'`);
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * @param {WordDefinition[]} words
     * @param {Context} context
     */
    _assertEnoughSpace(words, context) {
        let longestWord = '';
        let totalWordsLength = 0;
        for (const word of words) {
            if (word.text.length > longestWord.length) {
                longestWord = word.text;
            }

            totalWordsLength += word.text.length * word.repeats;
        }

        if (longestWord.length > context.width && longestWord.length > context.height) {
            context.onError(`Word ${longestWord} is longer than both Width and Height and can't fit`);
            return false;
        }

        const totalSquares = context.width * context.height;
        if (totalWordsLength > totalSquares) {
            const squarePlural = totalWordsLength !== 1 ? 'squares' : 'square';
            const totalPlural = totalSquares !== 1 ? 'squares' : 'square';
            context.onError(`All words take a total of ${totalWordsLength} ${squarePlural} which is longer than the total available amount of ${totalSquares} ${totalPlural}`);
            return false;
        }

        if (context.secretMode === 'fill-once' && totalWordsLength + context.secret.length > totalSquares) {
            const leftSquares = totalSquares - totalWordsLength;
            const leftPlural = leftSquares !== 1 ? 'squares' : 'square';
            const secretLength = context.secret.length;
            const secretPlural = secretLength !== 1 ? 'squares' : 'square';
            context.onError(`After all words are written there are only ${leftSquares} ${leftPlural} left, wherein the secret requires ${secretLength} ${secretPlural}`);
            return false;
        }

        return true;
    },


    /**
     * @param {Map.<string, number[]>} wordToPosMap
     * @param {string[][]} charactersArray
     * @param {Context} context
     * @returns
     */
    async _writeWords(wordToPosMap, charactersArray, context) {
        while (!context.isCancelled()) {
            let isValid = true;
            for (const word of context.words) {
                const positions = wordToPosMap.get(word) || [];
                word.finalX.length = 0;
                word.finalY.length = 0;
                word.finalDir.length = 0;

                for (let i = 0; i < word.repeats; i++) {
                    if (!this._writeWord(word, positions, charactersArray)) {
                        isValid = false;
                        break;
                    }
                }

            }

            if (isValid) {
                if (this._writeSecret(charactersArray, context)) {
                    return true;
                }
            }

            if (Date.now() > context.nextSleep) {
                context.onProgress(context.width, context.height, context.words, charactersArray);

                context.nextSleep = Date.now() + 30;
                await Regenerator._nextTick();
            }

            for (const word of context.words) {
                word.finalX.length = 0;
                word.finalY.length = 0;
                word.finalDir.length = 0;
            }

            for (let x = 0; x < context.width; x++) {
                for (let y = 0; y < context.height; y++) {
                    charactersArray[x][y] = '';
                }
            }
        }

        return false;
    },

    _writeWord(word, positions, charactersArray) {
        if (positions.length === 0) {
            return false;
        }

        for (let i = 0; i < 100; i++) {
            const position = positions[Math.random() * positions.length | 0];

            if (!Regenerator._willWordOverwriteAnother(word.text, position[0], position[1], position[2], charactersArray)) {
                Regenerator._writeWordIntoArray(word.text, position[0], position[1], position[2], charactersArray);
                word.finalX.push(position[0]);
                word.finalY.push(position[1]);
                word.finalDir.push(position[2]);

                return true;
            }
        }

        return false;
    },

    _writeSecret(charactersArray, context) {
        const attempts = context.secretMode === 'random' ? 1 : 100;
        const positions = this._getSecretPositions(charactersArray, context);

        for (let i = 0; i < attempts; i++) {
            const secret = this._getSecret(positions, context);
            const length = Math.min(secret.length, positions.length);

            for (let charIndex = 0; charIndex < length; charIndex++) {
                const [x, y] = positions[charIndex];
                charactersArray[x][y] = secret.charAt(charIndex % secret.length);
            }

            if (this._isUnique(charactersArray, context)) {
                return true;
            }
        }

        return false;
    },

    _getSecret(positions, context) {
        const baseSecret = context.secret || ' ';
        switch (context.secretMode) {
            case 'fill':
                if (baseSecret.length === 0) {
                    return ' '.repeat(positions.length);
                }
                return baseSecret.repeat(Math.ceil(positions.length / baseSecret.length));

            case 'fill-once':
                return baseSecret;

            case 'random':
            default:
                let secret = '';
                while (secret.length < positions.length) {
                    secret += baseSecret.charAt(Math.random() * baseSecret.length | 0);
                }

                return secret;
        }
    },

    _generate2dArray(width, height, fill) {
        const arr = [];
        for (let x = 0; x < width; x++) {
            arr[x] = [];
            for (let y = 0; y < height; y++) {
                arr[x][y] = fill;
            }
        }

        return arr;
    },

    /**
     * @param {number} width
     * @param {number} height
     * @param {WordDefinition} word
     * @returns
     */
    _generateAllowedWordPositions(width, height, word) {
        const positions = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (const direction of word.dirs) {
                    if (Regenerator._doesWordFitInDimensions(x, y, width, height, word.text, direction)) {
                        positions.push([x, y, direction]);
                    }
                }
            }
        }

        return Regenerator._scrambleArray(positions);
    },

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {string} word
     * @param {number} direction
     * @returns
     */
    _doesWordFitInDimensions(x, y, width, height, word, direction) {
        x += (word.length - 1) * DIR_DX[direction];
        y += (word.length - 1) * DIR_DY[direction];

        return x >= 0 && y >= 0 && x < width && y < height;
    },

    _willWordOverwriteAnother(word, x, y, direction, charactersArray) {
        const dx = DIR_DX[direction];
        const dy = DIR_DY[direction];
        for (let i = 0; i < word.length; i++) {
            if (charactersArray[x + i * dx][y + i * dy]) {
                return true;
            }
        }

        return false;
    },


    _writeWordIntoArray(word, x, y, direction, charactersArray) {
        const dx = DIR_DX[direction];
        const dy = DIR_DY[direction];

        for (let i = 0; i < word.length; i++) {
            charactersArray[x + i * dx][y + i * dy] = word.charAt(i);
        }
    },

    _removeWordFromArray(word, x, y, direction, charactersArray) {
        const dx = DIR_DX[direction];
        const dy = DIR_DY[direction];

        for (let i = 0; i < word.length; i++) {
            charactersArray[x + i * dx][y + i * dy] = '';
        }
    },


    _scrambleArray(array) {
        for (let i = 0; i < array.length; i++) {
            const index = Math.floor(Math.random() * (array.length - 1));
            const temp = array[index];
            array[index] = array[i];
            array[i] = temp;
        }
        return array;
    },

    _getSecretPositions(charactersArray, context) {
        const secretPositions = [];
        for (let y = 0; y < context.height; y++) {
            for (let x = 0; x < context.width; x++) {
                if (!charactersArray[x][y]) {
                    secretPositions.push([x, y]);
                }
            }
        }

        return secretPositions;
    },

    /**
     * @param {string[][]} charactersArray
     * @param {Context} context
     * @returns {boolean}
     */
    _isUnique(charactersArray, context) {
        for (const word of context.words) {
            let findCount = 0;

            for (let x = 0; x < context.width; x++) {
                for (let y = 0; y < context.height; y++) {
                    if (word.text.length === 1) {
                        if (charactersArray[x][y] === word.text) {
                            findCount++;
                        }
                        break;
                    }
                    for (const dir of ALL_DIRS) {
                        const dx = DIR_DX[dir];
                        const dy = DIR_DY[dir];
                        let isFound = true;

                        for (let i = 0; i < word.text.length; i++) {
                            const newX = x + dx * i;
                            const newY = y + dy * i;

                            if (newX < 0 || newY < 0 || newX >= WIDTH || newY >= HEIGHT) {
                                isFound = false;
                                break;
                            } else if (charactersArray[newX][newY] !== word.text.charAt(i)) {
                                isFound = false;
                                break;
                            }
                        }

                        if (isFound) {
                            findCount++;
                        }
                    }
                }
            }

            const expectedCount = word.repeats * (word.isPalindrome ? 2 : 1);
            if (findCount !== expectedCount) {
                return false;
            }
        }

        return true;
    },

    async _nextTick() {
        return new Promise(resolve => {
            setTimeout(resolve, 1);
        })
    }
}
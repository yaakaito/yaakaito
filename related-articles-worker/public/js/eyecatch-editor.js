// グローバル変数
let originalImageData = null;
let imageCanvas = null;
let imageCtx = null;
let gridCanvas = null;
let gridCtx = null;
let processedCanvas = null;
let processedCtx = null;
let processedGridCanvas = null;
let processedGridCtx = null;
let finalCanvas = null;
let finalCtx = null;
let selectedColor = null;
let currentTool = 'dot'; // 'dot' または 'fill'
let imagePosition = { x: 0, y: 0 };
let processedImageData = null;
let usedColors = [];
let editHistory = []; // 編集履歴を保存する配列
const MAX_HISTORY = 10; // 履歴の最大数（10回までundo可能）
let showGrid = true; // グリッド表示の状態（デフォルトは表示）
let selectedScale = 8; // 画像の倍率（デフォルトは8x）
let selectedBgColors = new Set(); // 背景色として選択された色のセット

// 画像アップロード処理
function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('ファイルが選択されていません'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const imageSrc = event.target.result;

            // プレビュー画像を設定
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = imageSrc;
            }

            const selectedImagePreview = document.getElementById('selectedImagePreview');
            if (selectedImagePreview) {
                selectedImagePreview.src = imageSrc;
            }

            // 画像編集UIを表示
            const imageEditor = document.getElementById('imageEditor');
            if (imageEditor) {
                imageEditor.style.display = 'block';
            }

            // キャンバスの初期化
            initializeCanvas(imageSrc);

            resolve(imageSrc);
        };

        reader.onerror = () => {
            reject(new Error('画像ファイルの読み込みに失敗しました'));
        };

        reader.readAsDataURL(file);
    });
}

// アップロードされた画像のプレビュー表示
function setupUploadPreview() {
    const uploadImageFile = document.getElementById('uploadImageFile');
    const uploadedImagePreview = document.getElementById('uploadedImagePreview');

    if (uploadImageFile && uploadedImagePreview) {
        uploadImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadedImagePreview.src = event.target.result;
                    uploadedImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                uploadedImagePreview.style.display = 'none';
            }
        });
    }
}

// キャンバスの初期化
function initializeCanvas(imageSrc) {
    imageCanvas = document.getElementById('imageCanvas');
    gridCanvas = document.getElementById('gridCanvas');

    if (!imageCanvas || !gridCanvas) return;

    imageCtx = imageCanvas.getContext('2d');
    gridCtx = gridCanvas.getContext('2d');

    const img = new Image();
    img.onload = function() {
        // キャンバスのサイズを画像に合わせる
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        gridCanvas.width = img.width;
        gridCanvas.height = img.height;

        // 画像を描画
        imageCtx.drawImage(img, 0, 0);

        // 元の画像データを保存
        originalImageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);

        // グリッドを描画
        drawGrid();

        // ツールボタンの設定
        setupToolButtons();

        // キャンバスのクリックイベントを設定
        setupCanvasClickEvents();
    };
    img.src = imageSrc;
}

// 最終出力用キャンバスの初期化
function initializeFinalCanvas() {
    finalCanvas = document.getElementById('finalCanvas');
    if (!finalCanvas) return;

    finalCtx = finalCanvas.getContext('2d');

    // 背景色を白で塗りつぶす
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // 処理済み画像を中央に配置
    if (processedCanvas) {
        imagePosition.x = (finalCanvas.width - processedCanvas.width) / 2;
        imagePosition.y = (finalCanvas.height - processedCanvas.height) / 2;
        drawImageOnFinalCanvas();
    }

    // 最終キャンバス関連のイベントを設定
    setupFinalCanvasEvents();
}

// 処理済み画像を最終キャンバスに描画
function drawImageOnFinalCanvas() {
    if (!finalCanvas || !finalCtx || !processedCanvas || !processedImageData) return;

    // 一度クリア
    finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // 背景色を適用
    const bgColor = document.getElementById('bgColorPicker').value;
    finalCtx.fillStyle = bgColor;
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // グリッドサイズを取得
    const gridSize = parseInt(document.getElementById('gridSizeSlider').value);

    // 処理済み画像のデータを取得
    const data = processedImageData.data;
    const width = processedCanvas.width;
    const height = processedCanvas.height;

    // ドットサイズを計算（倍率に基づく）
    // 1ドットは選択した倍率のサイズになる
    const dotSize = selectedScale;

    // 使用色を収集するための一時的なセット
    const colorSet = new Set();

    // 各ドットを個別に描画（補間なし）
    for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
            // グリッドの左上のピクセルの色を取得
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];

            // 完全に透明なピクセルはスキップ
            if (a === 0) continue;

            // 色をHEX形式で記録
            const colorHex = rgbToHex(r, g, b);
            colorSet.add(colorHex);

            // グリッドの位置をドットとして描画
            // グリッドサイズで割って何ドット目かを計算し、それに倍率をかける
            const dotX = imagePosition.x + (x / gridSize) * dotSize;
            const dotY = imagePosition.y + (y / gridSize) * dotSize;

            // 画面外のドットはスキップ
            if (dotX < 0 || dotX >= finalCanvas.width || dotY < 0 || dotY >= finalCanvas.height) continue;

            // ドットを描画
            finalCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            finalCtx.fillRect(dotX, dotY, dotSize, dotSize);
        }
    }

    // 使用色を更新
    usedColors = Array.from(colorSet);

    // 背景色パレットを更新
    updateBgColorPalette();

    // オフセット値を更新（中心からの相対位置）
    // ドット数を計算
    const dotCountX = Math.ceil(width / gridSize);
    const dotCountY = Math.ceil(height / gridSize);

    // 拡大後のサイズを計算
    const scaledWidth = dotCountX * dotSize;
    const scaledHeight = dotCountY * dotSize;

    const centerX = (finalCanvas.width - scaledWidth) / 2;
    const centerY = (finalCanvas.height - scaledHeight) / 2;

    const offsetXInput = document.getElementById('offsetXInput');
    const offsetYInput = document.getElementById('offsetYInput');

    if (offsetXInput && offsetYInput) {
        offsetXInput.value = Math.round(imagePosition.x - centerX);
        offsetYInput.value = Math.round(imagePosition.y - centerY);
    }
}

// キャンバスのクリックイベントを設定
function setupCanvasClickEvents() {
    const canvas = document.getElementById('processedCanvas');
    if (!canvas) return;

    canvas.addEventListener('click', (e) => {
        if (!selectedColor || !processedImageData) return;

        // 編集前の状態を履歴に保存
        saveToHistory();

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        const gridSize = parseInt(document.getElementById('gridSizeSlider').value);
        const offsetX = parseInt(document.getElementById('offsetXSlider').value);
        const offsetY = parseInt(document.getElementById('offsetYSlider').value);

        // グリッドに合わせた座標を計算
        // 修正: オフセットを考慮してグリッドの位置を正確に計算
        // クリックした位置がどのグリッドセルに属するかを計算
        const gridCol = Math.floor((x - offsetX) / gridSize);
        const gridRow = Math.floor((y - offsetY) / gridSize);

        // グリッドセルの左上の座標を計算
        const gridX = gridCol * gridSize + offsetX;
        const gridY = gridRow * gridSize + offsetY;

        // 画像の範囲外なら何もしない
        if (gridX >= canvas.width || gridY >= canvas.height) return;

        // 選択したツールに応じた処理
        if (currentTool === 'dot') {
            // ドット編集: クリックした位置のドットを選択した色に変更
            const [r, g, b] = hexToRgb(selectedColor);
            processedCtx.fillStyle = selectedColor;
            processedCtx.fillRect(
                gridX,
                gridY,
                Math.min(gridSize, canvas.width - gridX),
                Math.min(gridSize, canvas.height - gridY)
            );
        } else if (currentTool === 'fill') {
            // 塗りつぶし: クリックした位置と同じ色の連続した領域を選択した色で塗りつぶす
            floodFill(gridX, gridY, selectedColor);
        }

        // 処理後の画像データを更新
        processedImageData = processedCtx.getImageData(0, 0, canvas.width, canvas.height);

        // 最終キャンバスも更新
        drawImageOnFinalCanvas();

        // プレビュー画像を更新（現在の編集状態のみ）
        const previewImage = document.getElementById('previewImage');
        if (previewImage && processedCanvas) {
            const dataURL = processedCanvas.toDataURL('image/png');
            previewImage.src = dataURL;
            // 選択した元画像は更新しない
        }
    });
}

// 編集履歴に現在の状態を保存
function saveToHistory() {
    if (!processedCanvas || !processedCtx || !processedImageData) return;

    // 現在の画像データのコピーを作成
    const imageDataCopy = new ImageData(
        new Uint8ClampedArray(processedImageData.data),
        processedImageData.width,
        processedImageData.height
    );

    // 履歴に追加
    editHistory.push(imageDataCopy);

    // 履歴が最大数を超えたら古いものを削除
    if (editHistory.length > MAX_HISTORY) {
        editHistory.shift();
    }
}

// 編集履歴から前の状態に戻す
function undo() {
    if (editHistory.length === 0) return;

    // 履歴から最新の状態を取得
    const previousState = editHistory.pop();

    // キャンバスに適用
    processedCtx.putImageData(previousState, 0, 0);
    processedImageData = previousState;

    // 最終キャンバスも更新
    drawImageOnFinalCanvas();

    // 履歴がなくなったらUndoボタンを非表示
    if (editHistory.length === 0) {
        document.getElementById('undoButton').style.display = 'none';
    }
}

// 塗りつぶし処理（フラッドフィル）
function floodFill(startX, startY, fillColor) {
    if (!processedCanvas || !processedCtx || !processedImageData) return;

    const width = processedCanvas.width;
    const height = processedCanvas.height;
    const data = processedImageData.data;

    // クリックした位置の色を取得
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // 塗りつぶす色が同じなら何もしない
    const [fillR, fillG, fillB] = hexToRgb(fillColor);
    if (startR === fillR && startG === fillG && startB === fillB) return;

    // 訪問済みの位置を記録する配列
    const visited = new Array(width * height).fill(false);

    // 塗りつぶし処理を行うキュー
    const queue = [{x: startX, y: startY}];

    while (queue.length > 0) {
        const {x, y} = queue.shift();
        const pos = (y * width + x) * 4;

        // すでに訪問済みならスキップ
        if (visited[y * width + x]) continue;

        // 現在位置の色を取得
        const r = data[pos];
        const g = data[pos + 1];
        const b = data[pos + 2];
        const a = data[pos + 3];

        // 開始位置と同じ色でなければスキップ
        if (r !== startR || g !== startG || b !== startB || a !== startA) continue;

        // 現在位置を塗りつぶす
        processedCtx.fillStyle = fillColor;
        processedCtx.fillRect(x, y, 1, 1);

        // 訪問済みにする
        visited[y * width + x] = true;

        // 上下左右の位置をキューに追加
        if (x > 0) queue.push({x: x - 1, y: y});
        if (x < width - 1) queue.push({x: x + 1, y: y});
        if (y > 0) queue.push({x: x, y: y - 1});
        if (y < height - 1) queue.push({x: x, y: y + 1});
    }
}

// 最終キャンバス関連のイベントを設定
function setupFinalCanvasEvents() {
    // 倍率選択の処理
    const scaleSelector = document.getElementById('scaleSelector');
    const applyScaleButton = document.getElementById('applyScaleButton');

    if (scaleSelector && applyScaleButton) {
        // 初期値を設定
        scaleSelector.value = selectedScale.toString();

        applyScaleButton.addEventListener('click', () => {
            selectedScale = parseInt(scaleSelector.value);
            applyScaleToFinalCanvas();
        });
    }

    // メイン背景色パレットの初期化
    const mainBgColorPalette = document.getElementById('mainBgColorPalette');
    const bgColorPicker = document.getElementById('bgColorPicker');

    if (mainBgColorPalette && bgColorPicker) {
        // backgroundColorsからすべての色を取得
        const allColors = typeof backgroundColors !== 'undefined' 
            ? backgroundColors.map(c => c.value) 
            : Object.values(techAnimalMap).map(item => item.backgroundColor);

        // 白色が含まれていない場合は追加
        if (!allColors.includes('#ffffff') && !allColors.includes('#FFFFFF')) {
            allColors.unshift('#ffffff');
        }

        allColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;

            // 現在選択されている色をハイライト
            if (color === bgColorPicker.value) {
                swatch.classList.add('selected');
            }

            // 色をクリックしたときの処理
            swatch.addEventListener('click', () => {
                // 以前に選択されていた色の選択状態を解除
                document.querySelectorAll('#mainBgColorPalette .color-swatch').forEach(el => {
                    el.classList.remove('selected');
                });

                // クリックした色を選択状態にする
                swatch.classList.add('selected');

                // 選択した色を設定
                bgColorPicker.value = color;

                // 背景色を適用
                drawImageOnFinalCanvas();
            });

            mainBgColorPalette.appendChild(swatch);
        });
    }

    // 背景色として選択する色の処理
    const bgColorPalette = document.getElementById('bgColorPalette');
    const applyBgColorSelectionButton = document.getElementById('applyBgColorSelectionButton');

    if (bgColorPalette && applyBgColorSelectionButton) {
        // 使用色パレットから背景色パレットを生成
        updateBgColorPalette();

        applyBgColorSelectionButton.addEventListener('click', () => {
            applySelectedBgColors();
        });
    }

    // 画像位置調整ボタン
    const moveLeftButton = document.getElementById('moveLeftButton');
    const moveRightButton = document.getElementById('moveRightButton');
    const moveUpButton = document.getElementById('moveUpButton');
    const moveDownButton = document.getElementById('moveDownButton');
    const centerImageButton = document.getElementById('centerImageButton');

    if (moveLeftButton) {
        moveLeftButton.addEventListener('click', () => {
            imagePosition.x -= 10;
            drawImageOnFinalCanvas();
        });
    }

    if (moveRightButton) {
        moveRightButton.addEventListener('click', () => {
            imagePosition.x += 10;
            drawImageOnFinalCanvas();
        });
    }

    if (moveUpButton) {
        moveUpButton.addEventListener('click', () => {
            imagePosition.y -= 10;
            drawImageOnFinalCanvas();
        });
    }

    if (moveDownButton) {
        moveDownButton.addEventListener('click', () => {
            imagePosition.y += 10;
            drawImageOnFinalCanvas();
        });
    }

    if (centerImageButton) {
        centerImageButton.addEventListener('click', () => {
            if (processedCanvas) {
                imagePosition.x = (finalCanvas.width - processedCanvas.width) / 2;
                imagePosition.y = (finalCanvas.height - processedCanvas.height) / 2;
                drawImageOnFinalCanvas();
            }
        });
    }

    // 中心からのオフセット調整
    const offsetXInput = document.getElementById('offsetXInput');
    const offsetYInput = document.getElementById('offsetYInput');
    const applyOffsetXButton = document.getElementById('applyOffsetXButton');
    const applyOffsetYButton = document.getElementById('applyOffsetYButton');

    if (offsetXInput && applyOffsetXButton) {
        applyOffsetXButton.addEventListener('click', () => {
            const offsetX = parseInt(offsetXInput.value);
            if (!isNaN(offsetX)) {
                // グリッドサイズを取得
                const gridSize = parseInt(document.getElementById('gridSizeSlider').value);

                // ドット数を計算
                const dotCountX = Math.ceil(processedCanvas.width / gridSize);

                // 中心からのオフセットを計算
                const centerX = (finalCanvas.width - dotCountX * selectedScale) / 2;
                imagePosition.x = centerX + offsetX;
                drawImageOnFinalCanvas();
            }
        });
    }

    if (offsetYInput && applyOffsetYButton) {
        applyOffsetYButton.addEventListener('click', () => {
            const offsetY = parseInt(offsetYInput.value);
            if (!isNaN(offsetY)) {
                // グリッドサイズを取得
                const gridSize = parseInt(document.getElementById('gridSizeSlider').value);

                // ドット数を計算
                const dotCountY = Math.ceil(processedCanvas.height / gridSize);

                // 中心からのオフセットを計算
                const centerY = (finalCanvas.height - dotCountY * selectedScale) / 2;
                imagePosition.y = centerY + offsetY;
                drawImageOnFinalCanvas();
            }
        });
    }

    // 最終画像ダウンロードボタン
    const downloadFinalButton = document.getElementById('downloadFinalButton');
    if (downloadFinalButton) {
        downloadFinalButton.addEventListener('click', () => {
            if (finalCanvas) {
                const link = document.createElement('a');
                link.href = finalCanvas.toDataURL('image/png');
                link.download = 'final-eyecatch-1200x630.png';
                link.click();
            }
        });
    }
}

// 背景色パレットを更新する関数
function updateBgColorPalette() {
    const bgColorPalette = document.getElementById('bgColorPalette');
    if (!bgColorPalette) return;

    // 使用色がない場合は説明を表示
    if (!usedColors.length) {
        bgColorPalette.innerHTML = '<p style="color: #666; font-style: italic;">ドット絵に変換後、ここに色パレットが表示されます</p>';
        return;
    }

    bgColorPalette.innerHTML = '<p style="margin-bottom: 0.5rem; font-size: 0.9rem;">クリックして背景にしたい色を選択（複数選択可）</p>';

    usedColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;

        // 選択状態を反映
        if (selectedBgColors.has(color)) {
            swatch.classList.add('selected');
        }

        // 色をクリックしたときの処理
        swatch.addEventListener('click', () => {
            if (selectedBgColors.has(color)) {
                // すでに選択されている場合は選択解除
                selectedBgColors.delete(color);
                swatch.classList.remove('selected');
            } else {
                // 選択されていない場合は選択状態にする
                selectedBgColors.add(color);
                swatch.classList.add('selected');
            }
        });

        bgColorPalette.appendChild(swatch);
    });

    // 選択状態の説明を追加
    const selectionInfo = document.createElement('div');
    selectionInfo.style.marginTop = '0.5rem';
    selectionInfo.style.fontSize = '0.9rem';
    selectionInfo.style.color = '#666';
    selectionInfo.textContent = `${selectedBgColors.size}色選択中`;
    bgColorPalette.appendChild(selectionInfo);
}

// 選択した背景色を適用する関数
function applySelectedBgColors() {
    // 選択された色がない場合は警告を表示
    if (selectedBgColors.size === 0) {
        alert('背景として扱う色が選択されていません。色パレットから1つ以上の色を選択してください。');
        return;
    }

    if (!processedCanvas || !processedCtx || !processedImageData) return;

    // 編集前の状態を履歴に保存
    saveToHistory();

    // 背景色ピッカーの色を取得
    const bgColor = document.getElementById('bgColorPicker').value;

    // 処理済み画像のデータを取得
    const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    const data = imageData.data;

    // 選択した色を背景色に置き換える
    let replacedPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const hexColor = rgbToHex(r, g, b);

        if (selectedBgColors.has(hexColor)) {
            const [bgR, bgG, bgB] = hexToRgb(bgColor);
            data[i] = bgR;
            data[i + 1] = bgG;
            data[i + 2] = bgB;
            replacedPixels++;
        }
    }

    // 画像データを更新
    processedCtx.putImageData(imageData, 0, 0);
    processedImageData = imageData;

    // 最終キャンバスも更新
    drawImageOnFinalCanvas();

    // プレビュー画像を更新
    const previewImage = document.getElementById('previewImage');
    if (previewImage) {
        const dataURL = processedCanvas.toDataURL('image/png');
        previewImage.src = dataURL;
    }

    // 選択状態をリセット
    selectedBgColors.clear();
    updateBgColorPalette();

    // 操作完了メッセージ
    const percentage = Math.round((replacedPixels / totalPixels) * 100);
    alert(`背景色の適用が完了しました。画像の約${percentage}%が背景色に置き換えられました。`);
}

// 倍率を適用する関数
function applyScaleToFinalCanvas() {
    if (!processedCanvas || !finalCanvas) return;

    // 画像の中心位置を計算
    const centerX = finalCanvas.width / 2;
    const centerY = finalCanvas.height / 2;

    // グリッドサイズを取得
    const gridSize = parseInt(document.getElementById('gridSizeSlider').value);

    // ドットサイズを計算 - 1ドットが選択した倍率のサイズになる
    const dotSize = selectedScale;
    const width = processedCanvas.width;
    const height = processedCanvas.height;

    // ドット数を計算
    const dotCountX = Math.ceil(width / gridSize);
    const dotCountY = Math.ceil(height / gridSize);

    // スケールを適用した画像サイズを計算
    const scaledWidth = dotCountX * dotSize;
    const scaledHeight = dotCountY * dotSize;

    // 中心に配置するための位置を計算
    imagePosition.x = centerX - scaledWidth / 2;
    imagePosition.y = centerY - scaledHeight / 2;

    // 画像を描画
    drawImageOnFinalCanvas();
}

// グリッドの描画
function drawGrid(targetCanvas = 'original') {
    const isOriginal = targetCanvas === 'original';
    const canvas = isOriginal ? imageCanvas : processedCanvas;
    const gridCanvasObj = isOriginal ? gridCanvas : processedGridCanvas;
    const gridCtxObj = isOriginal ? gridCtx : processedGridCtx;

    if (!gridCanvasObj || !gridCtxObj || !canvas) return;

    // グリッドをクリア
    gridCtxObj.clearRect(0, 0, gridCanvasObj.width, gridCanvasObj.height);

    // グリッド表示がOFFの場合は何も描画しない
    if (!showGrid) return;

    const gridSize = parseInt(document.getElementById('gridSizeSlider').value);
    const offsetX = parseInt(document.getElementById('offsetXSlider').value);
    const offsetY = parseInt(document.getElementById('offsetYSlider').value);
    const width = canvas.width;
    const height = canvas.height;

    gridCtxObj.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    gridCtxObj.lineWidth = 1;

    // 縦線を描画（オフセットを考慮）
    for (let x = 0; x < width; x += gridSize) {
        const lineX = x + offsetX;
        if (lineX >= width) continue;

        gridCtxObj.beginPath();
        gridCtxObj.moveTo(lineX, 0);
        gridCtxObj.lineTo(lineX, height);
        gridCtxObj.stroke();
    }

    // 横線を描画（オフセットを考慮）
    for (let y = 0; y < height; y += gridSize) {
        const lineY = y + offsetY;
        if (lineY >= height) continue;

        gridCtxObj.beginPath();
        gridCtxObj.moveTo(0, lineY);
        gridCtxObj.lineTo(width, lineY);
        gridCtxObj.stroke();
    }
}

// グリッド表示の切り替え
function toggleGrid() {
    showGrid = !showGrid;

    // グリッド表示ボタンの表示を更新
    const toggleGridButton = document.getElementById('toggleGridButton');
    if (toggleGridButton) {
        if (showGrid) {
            toggleGridButton.classList.add('selected');
        } else {
            toggleGridButton.classList.remove('selected');
        }
    }

    // 両方のグリッドを再描画
    drawGrid('original');
    drawGrid('processed');
}

// 画像処理
function processImage() {
    if (!imageCanvas || !imageCtx || !originalImageData) return;

    const gridSize = parseInt(document.getElementById('gridSizeSlider').value);
    const offsetX = parseInt(document.getElementById('offsetXSlider').value);
    const offsetY = parseInt(document.getElementById('offsetYSlider').value);
    const width = imageCanvas.width;
    const height = imageCanvas.height;

    // 元の画像データを復元
    imageCtx.putImageData(originalImageData, 0, 0);

    // 処理用のキャンバスを取得
    processedCanvas = document.getElementById('processedCanvas');
    if (!processedCanvas) return;

    processedCtx = processedCanvas.getContext('2d');
    processedCanvas.width = width;
    processedCanvas.height = height;

    // 元の画像を処理用キャンバスにコピー
    processedCtx.drawImage(imageCanvas, 0, 0);

    // 使用した色を記録するオブジェクト（色 -> 使用回数）
    const colorUsage = {};

    // 四隅の色を記録する配列
    const cornerColors = [];

    // グリッドごとに処理（オフセットを考慮）
    for (let baseY = 0; baseY < height; baseY += gridSize) {
        for (let baseX = 0; baseX < width; baseX += gridSize) {
            // オフセットを適用
            const x = baseX + offsetX;
            const y = baseY + offsetY;

            // 画像の範囲外ならスキップ
            if (x >= width || y >= height) continue;

            // グリッド内の画素を取得
            const gridWidth = Math.min(gridSize, width - x);
            const gridHeight = Math.min(gridSize, height - y);

            const imageData = processedCtx.getImageData(x, y, gridWidth, gridHeight);
            const data = imageData.data;

            // 色の出現回数をカウント
            const colorCount = {};

            for (let i = 0; i < data.length; i += 4) {
                // 完全な透明ピクセルはスキップ
                if (data[i + 3] === 0) continue;

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const colorKey = `${r},${g},${b}`;

                colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
            }

            // 最も多く使われている色を見つける
            let maxCount = 0;
            let dominantColorKey = '0,0,0'; // デフォルトは黒

            for (const colorKey in colorCount) {
                if (colorCount[colorKey] > maxCount) {
                    maxCount = colorCount[colorKey];
                    dominantColorKey = colorKey;
                }
            }

            // 色をRGB配列に変換
            const [r, g, b] = dominantColorKey.split(',').map(Number);

            // グリッド全体を支配的な色で塗りつぶす
            processedCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            processedCtx.fillRect(x, y, gridWidth, gridHeight);

            // 使用した色を記録
            const colorHex = rgbToHex(r, g, b);
            colorUsage[colorHex] = (colorUsage[colorHex] || 0) + 1;

            // 四隅の色を記録
            const isCorner = (
                (x === offsetX && y === offsetY) || // 左上
                (x === offsetX && y >= height - gridSize) || // 左下
                (x >= width - gridSize && y === offsetY) || // 右上
                (x >= width - gridSize && y >= height - gridSize) // 右下
            );

            if (isCorner && !cornerColors.includes(colorHex)) {
                cornerColors.push(colorHex);
            }
        }
    }

    // 使用した色の配列を作成
    const usedColors = Object.keys(colorUsage);

    // 色の数を減らす処理
    let finalColors = [...usedColors];
    if (usedColors.length > 16) {
        finalColors = reduceColors(usedColors, cornerColors);

        // 画像の色を置き換える
        const fullImageData = processedCtx.getImageData(0, 0, width, height);
        const fullData = fullImageData.data;

        for (let i = 0; i < fullData.length; i += 4) {
            const r = fullData[i];
            const g = fullData[i + 1];
            const b = fullData[i + 2];
            const originalHex = rgbToHex(r, g, b);

            // 最も近い色を見つける
            const closestColor = findClosestColor(originalHex, finalColors);
            const [newR, newG, newB] = hexToRgb(closestColor);

            fullData[i] = newR;
            fullData[i + 1] = newG;
            fullData[i + 2] = newB;
        }

        processedCtx.putImageData(fullImageData, 0, 0);
    }

    // 処理後の画像データを保存
    processedImageData = processedCtx.getImageData(0, 0, width, height);

    // usedColorsを更新（配列のコピーを作成）
    usedColors.length = 0; // 配列を空にする
    finalColors.forEach(color => usedColors.push(color));

    // 色パレットを表示
    displayColorPalette(finalColors);

    // ステップ2を表示
    document.getElementById('processedImageContainer').style.display = 'block';

    // ステップ3も表示
    document.getElementById('finalCanvasContainer').style.display = 'block';

    // プレビュー画像を更新（現在の編集状態のみ）
    const previewImage = document.getElementById('previewImage');
    if (previewImage && processedCanvas) {
        const dataURL = processedCanvas.toDataURL('image/png');
        previewImage.src = dataURL;
        // 選択した元画像は更新しない
    }

    // 色の数を表示
    document.getElementById('colorCount').textContent = finalColors.length;

    // 加工後の画像用のグリッドキャンバスを初期化
    processedGridCanvas = document.getElementById('processedGridCanvas');
    if (processedGridCanvas) {
        processedGridCtx = processedGridCanvas.getContext('2d');
        processedGridCanvas.width = width;
        processedGridCanvas.height = height;

        // グリッドを描画
        drawGrid('processed');
    }

    // 最終出力用キャンバスの初期化
    initializeFinalCanvas();
}

// 色パレットの表示
function displayColorPalette(colors) {
    const paletteContainer = document.getElementById('colorPalette');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';

    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;

        // 色をクリックしたときの処理
        swatch.addEventListener('click', () => {
            // 以前に選択されていた色の選択状態を解除
            document.querySelectorAll('#colorPalette .color-swatch').forEach(el => {
                el.classList.remove('selected');
            });

            // クリックした色を選択状態にする
            swatch.classList.add('selected');
            selectedColor = color;
        });

        paletteContainer.appendChild(swatch);
    });

    // 最初の色を選択状態にする
    if (colors.length > 0 && !selectedColor) {
        const firstSwatch = paletteContainer.querySelector('.color-swatch');
        if (firstSwatch) {
            firstSwatch.classList.add('selected');
            selectedColor = colors[0];
        }
    }

    // 背景色パレットも同時に更新
    updateBgColorPalette();
}

// ツール選択ボタンのイベント設定
function setupToolButtons() {
    const dotToolButton = document.getElementById('dotToolButton');
    const fillToolButton = document.getElementById('fillToolButton');
    const toggleGridButton = document.getElementById('toggleGridButton');

    if (dotToolButton && fillToolButton) {
        // ドット編集ツールをクリックしたとき
        dotToolButton.addEventListener('click', () => {
            dotToolButton.classList.add('selected');
            fillToolButton.classList.remove('selected');
            currentTool = 'dot';
        });

        // 塗りつぶしツールをクリックしたとき
        fillToolButton.addEventListener('click', () => {
            fillToolButton.classList.add('selected');
            dotToolButton.classList.remove('selected');
            currentTool = 'fill';
        });
    }

    // グリッド表示切替ボタンのクリックイベント
    if (toggleGridButton) {
        // 初期状態の設定（デフォルトは表示ON）
        if (showGrid) {
            toggleGridButton.classList.add('selected');
        }

        toggleGridButton.addEventListener('click', toggleGrid);
    }
}

// 色の数を減らす処理
function reduceColors(colors, cornerColors) {
    // 黒色は必ず残す
    const blackColor = '#000000';
    let reducedColors = colors.includes(blackColor) ? [blackColor] : [];

    // 色の使用頻度を取得
    const colorUsage = {};
    for (const color of colors) {
        colorUsage[color] = colorUsage[color] || 0;
    }

    // 四隅の色とその近似色を特定
    const cornerColorGroups = {};
    for (const cornerColor of cornerColors) {
        cornerColorGroups[cornerColor] = [cornerColor];

        // 四隅の色と極めて近い色を見つける（色の距離が閾値以下）
        const similarityThreshold = 30; // 色の距離の閾値
        for (const color of colors) {
            if (color === cornerColor) continue;

            const distance = colorDistance(color, cornerColor);
            if (distance < similarityThreshold) {
                cornerColorGroups[cornerColor].push(color);
            }
        }
    }

    // 四隅の色とその近似色を除外した残りの色
    const remainingColors = colors.filter(color => {
        for (const cornerColor in cornerColorGroups) {
            if (cornerColorGroups[cornerColor].includes(color)) {
                return false;
            }
        }
        return color !== blackColor;
    });

    // 人間が識別できない濃淡の差がある色をまとめる
    const colorClusters = [];
    const processedColors = new Set();

    for (const color of remainingColors) {
        if (processedColors.has(color)) continue;

        const cluster = [color];
        processedColors.add(color);

        // 非常に近い色をクラスタリング
        const similarityThreshold = 15; // 色の距離の閾値
        for (const otherColor of remainingColors) {
            if (color === otherColor || processedColors.has(otherColor)) continue;

            const distance = colorDistance(color, otherColor);
            if (distance < similarityThreshold) {
                cluster.push(otherColor);
                processedColors.add(otherColor);
            }
        }

        // クラスタ内で最も使用頻度が高い色を代表色として選択
        let representativeColor = cluster[0];
        let maxUsage = colorUsage[representativeColor] || 0;

        for (const clusterColor of cluster) {
            const usage = colorUsage[clusterColor] || 0;
            if (usage > maxUsage) {
                maxUsage = usage;
                representativeColor = clusterColor;
            }
        }

        colorClusters.push({
            color: representativeColor,
            usage: maxUsage
        });
    }

    // 使用頻度に基づいてクラスタをソート
    colorClusters.sort((a, b) => b.usage - a.usage);

    // 最大16色になるまで色を追加（黒を含む）
    for (const cluster of colorClusters) {
        if (reducedColors.length >= 16) break;
        reducedColors.push(cluster.color);
    }

    return reducedColors;
}

// 最も近い色を見つける
function findClosestColor(targetColor, colorPalette) {
    let minDistance = Infinity;
    let closestColor = colorPalette[0];

    for (const color of colorPalette) {
        const distance = colorDistance(targetColor, color);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }

    return closestColor;
}

// 色の距離を計算（ユークリッド距離）
function colorDistance(color1, color2) {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);

    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

// スライダーの処理を設定
document.addEventListener('DOMContentLoaded', () => {
    // スライダーの処理
    const gridSizeSlider = document.getElementById('gridSizeSlider');
    const gridSizeValue = document.getElementById('gridSizeValue');
    const offsetXSlider = document.getElementById('offsetXSlider');
    const offsetXValue = document.getElementById('offsetXValue');
    const offsetYSlider = document.getElementById('offsetYSlider');
    const offsetYValue = document.getElementById('offsetYValue');

    // グリッドサイズスライダーの処理
    if (gridSizeSlider && gridSizeValue) {
        gridSizeSlider.addEventListener('input', () => {
            const value = gridSizeSlider.value;
            gridSizeValue.textContent = `${value}px`;

            // オフセットの最大値をグリッドサイズに合わせて調整
            const maxOffset = parseInt(value) - 1;
            offsetXSlider.max = maxOffset;
            offsetYSlider.max = maxOffset;

            // 現在の値が新しい最大値を超えている場合は調整
            if (parseInt(offsetXSlider.value) > maxOffset) {
                offsetXSlider.value = maxOffset;
                offsetXValue.textContent = `${maxOffset}px`;
            }

            if (parseInt(offsetYSlider.value) > maxOffset) {
                offsetYSlider.value = maxOffset;
                offsetYValue.textContent = `${maxOffset}px`;
            }

            drawGrid();
        });
    }

    // X方向オフセットスライダーの処理
    if (offsetXSlider && offsetXValue) {
        offsetXSlider.addEventListener('input', () => {
            const value = offsetXSlider.value;
            offsetXValue.textContent = `${value}px`;
            drawGrid();
        });
    }

    // Y方向オフセットスライダーの処理
    if (offsetYSlider && offsetYValue) {
        offsetYSlider.addEventListener('input', () => {
            const value = offsetYSlider.value;
            offsetYValue.textContent = `${value}px`;
            drawGrid();
        });
    }

    // 処理ボタンのクリックイベント
    const processButton = document.getElementById('processButton');
    if (processButton) {
        processButton.addEventListener('click', processImage);
    }

    // リセットボタンのクリックイベント
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const selectedImage = document.getElementById('selectedImage');
            if (selectedImage && selectedImage.src) {
                initializeCanvas(selectedImage.src);

                // ステップ2と3を非表示
                const processedImageContainer = document.getElementById('processedImageContainer');
                const finalCanvasContainer = document.getElementById('finalCanvasContainer');

                if (processedImageContainer) processedImageContainer.style.display = 'none';
                if (finalCanvasContainer) finalCanvasContainer.style.display = 'none';
            }
        });
    }

    // Undoボタンのクリックイベント
    const undoButton = document.getElementById('undoButton');
    if (undoButton) {
        undoButton.addEventListener('click', undo);
    }

    // Ctrl+Zのキーボードショートカット
    window.addEventListener('keydown', (e) => {
        // Ctrl+Z (Windows/Linux) または Command+Z (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            // 処理済み画像が表示されている場合のみundo実行
            const processedImageContainer = document.getElementById('processedImageContainer');
            if (processedImageContainer && processedImageContainer.style.display !== 'none') {
                e.preventDefault(); // デフォルトのブラウザのundo動作を防止
                undo();
            }
        }
    });

    // 処理済み画像ダウンロードボタンのクリックイベント
    const downloadProcessedButton = document.getElementById('downloadProcessedButton');
    if (downloadProcessedButton) {
        downloadProcessedButton.addEventListener('click', () => {
            const processedCanvas = document.getElementById('processedCanvas');
            if (processedCanvas) {
                const link = document.createElement('a');
                link.href = processedCanvas.toDataURL('image/png');
                link.download = 'processed-pixel-art.png';
                link.click();
            }
        });
    }
});

// アイキャッチとして保存ボタンのイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    const uploadEyecatchButton = document.getElementById('uploadEyecatchButton');
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadEyecatchButton && uploadStatus) {
        uploadEyecatchButton.addEventListener('click', async () => {
            const finalCanvas = document.getElementById('finalCanvas');
            if (!finalCanvas) {
                alert('最終キャンバスが初期化されていません。ドット絵の生成を完了してください。');
                return;
            }

            // ボタンを無効化
            uploadEyecatchButton.disabled = true;
            uploadEyecatchButton.textContent = 'アップロード中...';

            // ステータス表示を初期化
            uploadStatus.style.display = 'block';
            uploadStatus.style.backgroundColor = '#f0f9ff';
            uploadStatus.style.color = '#0066cc';
            uploadStatus.style.border = '1px solid #d0e3ff';
            uploadStatus.textContent = 'アイキャッチ画像をアップロード中...';

            try {
                // 画像データを取得
                const imageData = finalCanvas.toDataURL('image/png').split(',')[1];

                // 記事IDを取得
                let articleId = window.generatedForArticleId;

                // APIキーを取得
                const apiKey = getApiKeyFromCookie();
                if (!apiKey) {
                    throw new Error('APIキーが必要です。ログインしてください。');
                }

                if (!articleId) {
                    // 記事IDがない場合は警告
                    uploadStatus.style.backgroundColor = '#fff9e6';
                    uploadStatus.style.color = '#b45309';
                    uploadStatus.style.border = '1px solid #fde68a';
                    uploadStatus.textContent = '警告: 記事IDが見つかりません。直接入力した内容から生成された画像です。';

                    // 3秒後に確認ダイアログを表示
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // 確認ダイアログ
                    const userInput = prompt('アップロード先の記事IDを入力してください:');
                    if (!userInput) {
                        throw new Error('アップロードがキャンセルされました');
                    }
                    articleId = userInput.trim();
                }

                // アップロードリクエスト
                const response = await fetch('/upload_eyecatch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({
                        id: articleId,
                        imageData: imageData
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'アップロードに失敗しました');
                }

                // 成功メッセージ
                uploadStatus.style.backgroundColor = '#f0fdf4';
                uploadStatus.style.color = '#166534';
                uploadStatus.style.border = '1px solid #bbf7d0';
                uploadStatus.textContent = `アイキャッチ画像が記事ID: ${articleId} に正常にアップロードされました！`;

                // プレビューリンクを追加
                const previewLink = document.createElement('a');
                previewLink.href = `/eyecatch?id=${articleId}`;
                previewLink.target = '_blank';
                previewLink.textContent = 'アイキャッチ画像を表示';
                previewLink.style.display = 'block';
                previewLink.style.marginTop = '10px';
                previewLink.style.textDecoration = 'underline';
                uploadStatus.appendChild(previewLink);

            } catch (error) {
                // エラーメッセージ
                uploadStatus.style.backgroundColor = '#fef2f2';
                uploadStatus.style.color = '#b91c1c';
                uploadStatus.style.border = '1px solid #fecaca';
                uploadStatus.textContent = `エラー: ${error.message}`;
            } finally {
                // ボタンを再有効化
                uploadEyecatchButton.disabled = false;
                uploadEyecatchButton.textContent = 'アイキャッチとして保存';
            }
        });
    }
});

// main.js: Основной файл, инициализирует и связывает все части

document.addEventListener("DOMContentLoaded", function() {

    const canvas = document.getElementById("renderCanvas");
    if (!canvas) { console.error("Canvas element #renderCanvas not found!"); return; }

    const engine = new BABYLON.Engine(canvas, true, { stencil: true, antialias: true });
    if (!engine) { console.error("Babylon engine could not be created!"); return; }

    const scene = new BABYLON.Scene(engine);
    // Включаем гравитацию и столкновения на уровне сцены (если не используем физический движок)
    scene.gravity = new BABYLON.Vector3(0, -0.9, 0); // Пример гравитации (может конфликтовать с ручной гравитацией в player.js, лучше выбрать один метод)
    scene.collisionsEnabled = true;

    // --- Окружение ---
    if (typeof createEnvironment !== 'function') { console.error("createEnvironment function is not defined!"); return; }
    const environmentData = createEnvironment(scene);
    // Убедимся что у земли включены коллизии (уже сделано в environment.js)
    // environmentData.ground.checkCollisions = true;

    // --- Игрок ---
    if (typeof createPlayer !== 'function') { console.error("createPlayer function is not defined!"); return; }
    const playerData = createPlayer(scene);
    const playerRoot = playerData.root;
    const cameraTarget = playerData.cameraTarget;
    // Включаем коллизии для корневого узла игрока (если используем встроенные коллизии Babylon)
    // playerRoot.checkCollisions = true;
    // playerRoot.ellipsoid = new BABYLON.Vector3(0.5, 1.0, 0.5); // Размеры "хитбокса" игрока
    // playerRoot.ellipsoidOffset = new BABYLON.Vector3(0, 1.0, 0); // Смещение хитбокса относительно точки playerRoot

    // --- Камера ---
    const defaultCameraBeta = Math.PI / 3.5; // Угол наклона камеры по умолчанию (вертикальный)
    const cameraReturnLerpSpeed = 0.08;   // Скорость возврата камеры (0 до 1)
    const cameraReturnDelay = 1000;       // Задержка возврата в миллисекундах (1 секунда)

    // Создаем ArcRotateCamera
    var camera = new BABYLON.ArcRotateCamera(
        "arcCam",
        -Math.PI / 2,             // Начальный alpha (горизонтальный угол): -PI/2 ставит камеру на -Z (сзади игрока, смотрящего на +Z)
        defaultCameraBeta,        // Начальный beta (вертикальный угол)
        12,                       // Начальный радиус (расстояние от цели)
        cameraTarget,             // Цель камеры (точка внутри игрока)
        scene
    );

    // Включаем стандартное управление мышью/тачем для камеры
    camera.attachControl(canvas, true);

    // Ограничиваем управление только левой кнопкой мыши (0)
    // Если нужно управление тачем, это может потребовать доп. настроек или оставить по умолчанию
    if (camera.inputs.attached.pointers) { // Проверяем, что управление указателями подключено
       camera.inputs.attached.pointers.buttons = [0]; // 0 - левая кнопка, 1 - колесо/средняя, 2 - правая
    }


    // Настройки пределов камеры
    camera.lowerBetaLimit = Math.PI / 8;    // Минимальный угол наклона (не смотреть снизу вверх слишком сильно)
    camera.upperBetaLimit = (Math.PI / 2) * 0.95; // Максимальный угол наклона (не смотреть ровно сверху)
    camera.lowerRadiusLimit = 4;            // Минимальное приближение
    camera.upperRadiusLimit = 25;           // Максимальное отдаление
    camera.wheelPrecision = 50;             // Чувствительность колеса мыши
    camera.pinchPrecision = 100;            // Чувствительность щипка (тач)

    // --- Логика возврата камеры с задержкой ---
    let isUserInteractingWithCamera = false; // Флаг: управляет ли пользователь камерой сейчас
    let returnTimeoutId = null;             // ID для setTimeout, чтобы его можно было отменить

    // Функция для запуска таймера задержки перед возвратом камеры
    function startReturnTimeout() {
        // console.log("Attempting to start return timeout...");
        clearTimeout(returnTimeoutId); // Отменяем любой предыдущий запущенный таймер
        returnTimeoutId = setTimeout(() => {
            // console.log(">>> Timeout finished! Allowing camera return.");
            isUserInteractingWithCamera = false; // Разрешаем автоматический возврат камеры
        }, cameraReturnDelay); // Запускаем с заданной задержкой
        // console.log(`Return timeout scheduled (ID: ${returnTimeoutId})`);
    }

    // Отслеживаем начало взаимодействия пользователя с камерой (нажатие кнопки мыши/тач)
    camera.onPointerDown = (evt, pickResult) => {
        // Игнорируем, если нажали не ту кнопку, которая разрешена для вращения
        if (camera.inputs.attached.pointers && camera.inputs.attached.pointers.buttons.indexOf(evt.button) === -1) {
            return;
        }
        // console.log("Camera interaction START - Disabling auto-return");
        isUserInteractingWithCamera = true; // Пользователь начал управлять
        clearTimeout(returnTimeoutId);      // Отменяем таймер возврата, если он был активен
    };

    // Отслеживаем окончание взаимодействия (отпускание кнопки/пальца)
    camera.onPointerUp = (evt) => {
         // Игнорируем, если отпустили не ту кнопку, которая разрешена для вращения
        if (camera.inputs.attached.pointers && camera.inputs.attached.pointers.buttons.indexOf(evt.button) === -1) {
             // Если отпустили другую кнопку, но основная все еще нажата - не запускаем таймер
             // Проверка на actual Pointers сложновата, пока оставим так
             // return;
        }
       // console.log("Camera interaction END - starting return timeout");
        startReturnTimeout(); // Запускаем таймер для возврата к автоматическому режиму
    };

    // Дополнительно: если указатель уходит с канваса, тоже запускаем таймер
    canvas.addEventListener('pointerleave', function() {
        // Запускаем таймер только если камера не находится в состоянии инерционного движения
        if (camera.inertialAlphaOffset === 0 && camera.inertialBetaOffset === 0 && camera.inertialRadiusOffset === 0) {
             // console.log("Pointer Left Canvas - starting return timeout");
             startReturnTimeout();
        } else {
            // console.log("Pointer Left Canvas - but camera has inertia, delaying timeout start");
            // Можно подождать окончания инерции или запустить таймер все равно
            startReturnTimeout(); // Пока запускаем сразу
        }
    });

    // --- Цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (!scene || !playerRoot || !camera) return; // Доп. проверка на всякий случай

        // Если пользователь не управляет камерой (и таймер задержки истек)
        if (!isUserInteractingWithCamera) {
            // Целевой горизонтальный угол камеры: позади игрока
            // ==============================================================
            // !!! ИЗМЕНЕНИЕ ЗДЕСЬ: Формула для целевого угла !!!
            // Угол игрока + PI радиан (180 градусов)
            const targetCameraAlpha = playerRoot.rotation.y + Math.PI;
            // ==============================================================

            // Целевой вертикальный угол камеры (возвращаем к значению по умолчанию)
            const targetCameraBeta = defaultCameraBeta;

            // Используем LerpAngle для плавного перехода к целевому горизонтальному углу
            // LerpAngle корректно обрабатывает переход через 0/2PI
            camera.alpha = BABYLON.Scalar.LerpAngle(camera.alpha, targetCameraAlpha, cameraReturnLerpSpeed);

            // Используем обычный Lerp для плавного перехода к целевому вертикальному углу
            camera.beta = BABYLON.Scalar.Lerp(camera.beta, targetCameraBeta, cameraReturnLerpSpeed);

             // Можно также плавно возвращать радиус к значению по умолчанию, если нужно
             // camera.radius = BABYLON.Scalar.Lerp(camera.radius, 12, cameraReturnLerpSpeed * 0.5);
        }
        // Если isUserInteractingWithCamera = true, то углы camera.alpha и camera.beta
        // обновляются встроенным механизмом camera.attachControl, и мы их не трогаем.

        // Рендерим сцену
        scene.render();
    });

    // --- Обработка изменения размера окна ---
    window.addEventListener("resize", function () {
        engine.resize();
    });

    console.log("Babylon.js scene initialized successfully.");
});

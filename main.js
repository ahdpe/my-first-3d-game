// main.js: Основной файл, инициализирует и СВЯЗЫВАЕТ все части

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true });
const scene = new BABYLON.Scene(engine);

// --- Асинхронная инициализация ---
async function setupGame() {
    // Создаем окружение
    const environmentData = createEnvironment(scene);

    // --- Создаем игрока (получаем его данные) ---
    const playerData = await createPlayer(scene); // Ждем загрузки модели и получаем объект с данными
    if (!playerData || !playerData.mesh) {
        console.error("Не удалось создать игрока!");
        return; // Выходим, если игрок не создан
    }

    // --- Создаем камеру (ПОСЛЕ игрока) ---
    // Используем playerData.mesh для привязки
    const camera = new BABYLON.FollowCamera("followCam", playerData.mesh.position.clone(), scene);
    camera.radius = 8;
    camera.heightOffset = 4;
    camera.rotationOffset = 0; // 0 для вида сзади
    camera.cameraAcceleration = 0.05;
    camera.maxCameraSpeed = 10;
    camera.lockedTarget = playerData.mesh; // Привязываем к мешу игрока
    camera.attachControl(canvas, true);

    // --- Регистрируем ОБНОВЛЕНИЕ ИГРОКА в цикле рендера ---
    // Теперь у нас есть и playerData, и camera
    scene.onBeforeRenderObservable.add(() => {
        // Вызываем функцию обновления из player.js, передавая ей данные и камеру
        updatePlayerState(playerData, camera);
    });

    // --- Запускаем цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (scene) {
            scene.render();
        }
    });

    // --- Следим за изменением размера окна ---
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

// --- Запуск ---
setupGame().catch(error => {
    console.error("Критическая ошибка при инициализации игры:", error);
});

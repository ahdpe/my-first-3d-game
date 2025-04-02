// main.js: Основной файл, инициализирует и связывает все части

// Находим наш холст на странице
const canvas = document.getElementById("renderCanvas");
// Создаем движок Babylon.js
const engine = new BABYLON.Engine(canvas, true, { stencil: true });
// Создаем основную сцену
const scene = new BABYLON.Scene(engine);

// --- Функция для асинхронной инициализации ---
async function setupGame() {
    // --- Создаем окружение ---
    // Вызываем функцию из environment.js
    const environmentData = createEnvironment(scene);
    // Можно использовать environmentData.ground, если нужно

    // --- Создаем игрока (ЖДЕМ ЗАВЕРШЕНИЯ ЗАГРУЗКИ) ---
    // Вызываем асинхронную функцию из player.js и ждем результат
    const player = await createPlayer(scene); // <<--- Используем await

    // --- Создаем камеру ---
    // Камера создается здесь, ПОСЛЕ того как 'player' был успешно загружен и возвращен
    var camera = new BABYLON.FollowCamera("followCam", player.position.add(new BABYLON.Vector3(0, 10, -10)), scene); // Начальная позиция камеры относительно игрока
    camera.radius = 8; // Дистанция от игрока
    camera.heightOffset = 4; // Высота над игроком
    camera.rotationOffset = 0; // 0 = вид сзади, 180 = вид спереди. Для управления лучше 0.
    camera.cameraAcceleration = 0.05; // Плавность следования
    camera.maxCameraSpeed = 10; // Макс скорость камеры
    camera.lockedTarget = player; // Привязываем камеру к загруженному игроку
    camera.attachControl(canvas, true);

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

// --- Запускаем асинхронную инициализацию ---
setupGame().catch(error => {
    console.error("Ошибка при инициализации игры:", error);
});

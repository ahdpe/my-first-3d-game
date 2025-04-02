// main.js: Основной файл, инициализирует и связывает все части

// Находим наш холст на странице
const canvas = document.getElementById("renderCanvas");
// Создаем движок Babylon.js
const engine = new BABYLON.Engine(canvas, true, { stencil: true });
// Создаем основную сцену
const scene = new BABYLON.Scene(engine);

// --- Создаем окружение ---
// Вызываем функцию из environment.js
const environmentData = createEnvironment(scene);
// Можно использовать environmentData.ground, если нужно

// --- Создаем игрока ---
// Вызываем функцию из player.js
const player = createPlayer(scene); // Эта функция вернет нам объект игрока

// --- Создаем камеру ---
// Камера создается здесь, так как ей нужен 'player' в качестве цели
var camera = new BABYLON.FollowCamera("followCam", new BABYLON.Vector3(0, 10, -10), scene);
camera.radius = 8;
camera.heightOffset = 4;
// Используйте 0 для вида сзади или 180 для вида спереди (влияет на ощущение управления)
camera.rotationOffset = 180; // <<--- Попробуйте 180 или 0 здесь!
camera.cameraAcceleration = 0.05;
camera.maxCameraSpeed = 10;
camera.lockedTarget = player; // Привязываем камеру к игроку, созданному в player.js
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

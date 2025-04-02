// main.js: Основной файл, инициализирует и связывает все части

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true });
const scene = new BABYLON.Scene(engine);

// --- Создаем окружение ---
const environmentData = createEnvironment(scene);

// --- Создаем игрока ---
// Теперь createPlayer возвращает объект { root: ..., cameraTarget: ... }
const playerData = createPlayer(scene);
const playerRoot = playerData.root; // Корневой узел для логики игрока
const cameraTarget = playerData.cameraTarget; // Точка, за которой следит камера

// --- Создаем камеру ---
// Используем ArcRotateCamera вместо FollowCamera
var camera = new BABYLON.ArcRotateCamera(
    "arcCam",
    -Math.PI / 2,             // Начальный угол alpha (горизонтальный) - будет обновляться
    Math.PI / 3,              // Начальный угол beta (вертикальный) - вид немного сверху
    10,                       // Начальный радиус (расстояние от цели)
    cameraTarget,             // Цель камеры - узел на уровне туловища
    scene
);

// Убираем стандартное управление мышью/тачем для этой камеры,
// так как мы будем управлять ей программно
// camera.attachControl(canvas, true); // <-- ЗАКОММЕНТИРУЙТЕ или УДАЛИТЕ ЭТУ СТРОКУ

// Настроим пределы для beta, чтобы не смотреть ровно сверху или снизу
camera.lowerBetaLimit = Math.PI / 4;  // Не ближе 45 градусов сверху
camera.upperBetaLimit = Math.PI / 2 + Math.PI / 10; // Немного ниже горизонта
camera.lowerRadiusLimit = 5;
camera.upperRadiusLimit = 15;


// --- Запускаем цикл рендеринга ---
engine.runRenderLoop(function () {
    if (scene) {
        // --- Обновление Камеры ---
        // Устанавливаем горизонтальный угол камеры (alpha) так, чтобы он соответствовал
        // повороту игрока (playerRoot.rotation.y), но со смещением на PI (180 градусов),
        // чтобы камера была СЗАДИ.
        // Важно: делаем это *каждый кадр* ПОСЛЕ того, как обновилась логика игрока.
        camera.alpha = playerRoot.rotation.y - Math.PI;

        scene.render();
    }
});

// --- Следим за изменением размера окна ---
window.addEventListener("resize", function () {
    engine.resize();
});

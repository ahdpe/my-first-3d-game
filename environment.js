// environment.js: Отвечает за создание окружения

function createEnvironment(scene) {
    // Создаем свет
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Создаем землю
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene); // Сделал землю побольше

    // Создаем и применяем материал земли
    var groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0); // Зеленый цвет
    // groundMaterial.wireframe = true; // Раскомментируйте для отладки, чтобы видеть сетку
    ground.material = groundMaterial;

    // Включаем проверку столкновений для земли (может понадобиться позже)
    ground.checkCollisions = true;

    // Возвращаем созданные объекты
    return {
        ground: ground
    };
}

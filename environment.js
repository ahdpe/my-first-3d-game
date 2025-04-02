// environment.js: Отвечает за создание окружения

function createEnvironment(scene) {
    // Создаем свет
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Создаем землю
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 10, height: 10}, scene);

    // Создаем и применяем материал земли
    var groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0); // Зеленый цвет
    ground.material = groundMaterial;

    // Возвращаем созданные объекты, если они понадобятся где-то еще
    // Пока возвращаем только землю, на всякий случай
    return {
        ground: ground
    };
}

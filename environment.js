// environment.js: Отвечает за создание окружения

function createEnvironment(scene) {
    // Создаем свет
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Создаем землю
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene); // Увеличил размер земли

    // Создаем и применяем материал земли
    var groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0); // Зеленый цвет
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Убрал блики
    // Можно добавить текстуру
    // groundMaterial.diffuseTexture = new BABYLON.Texture("assets/textures/grass.jpg", scene); // Если есть текстура
    ground.material = groundMaterial;

    // Возвращаем созданные объекты, если они понадобятся где-то еще
    return {
        ground: ground
    };
}

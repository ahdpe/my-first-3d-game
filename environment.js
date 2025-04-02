
function createEnvironment(scene) {
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;

    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene);
    var groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
    ground.material = groundMaterial;
    ground.checkCollisions = true;

    return { ground: ground };
}

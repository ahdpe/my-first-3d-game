
window.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    // Свет
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Земля
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    ground.checkCollisions = true;

    // Игрок (просто коробка)
    const player = BABYLON.MeshBuilder.CreateBox("player", { height: 2, width: 1, depth: 1 }, scene);
    player.position.y = 1;

    // Камера — FollowCamera
    const camera = new BABYLON.FollowCamera("followCam", player.position.clone(), scene);
    camera.radius = 8;
    camera.heightOffset = 3;
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.05;
    camera.maxCameraSpeed = 20;
    camera.lockedTarget = player;

    // Управление
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, evt => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));

    const speed = 0.1;
    scene.onBeforeRenderObservable.add(() => {
        let move = new BABYLON.Vector3.Zero();
        if (inputMap["w"]) move.z -= 1;
        if (inputMap["s"]) move.z += 1;
        if (inputMap["a"]) move.x -= 1;
        if (inputMap["d"]) move.x += 1;

        if (move.length() > 0) {
            move.normalize();
            player.moveWithCollisions(move.scale(speed));
            player.rotation.y = Math.atan2(move.x, move.z);
        }
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
});

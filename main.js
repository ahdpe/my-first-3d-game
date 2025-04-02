
document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    const environmentData = createEnvironment(scene);
    const playerData = createPlayer(scene);
    const playerRoot = playerData.root;

    // FollowCamera
    const camera = new BABYLON.FollowCamera("followCam", playerRoot.position.clone(), scene);
    camera.radius = 10;
    camera.heightOffset = 4;
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.05;
    camera.maxCameraSpeed = 20;
    camera.lockedTarget = playerRoot;

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
});

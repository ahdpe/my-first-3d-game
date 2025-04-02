function createPlayer(scene) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0, torsoWidth = 0.5, torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8, limbThickness = 0.2;
    const groundLevel = 0;

    const PlayerState = { IDLE: 0, WALKING: 1, RUNNING: 2, JUMP_ANTICIPATION: 3, AIRBORNE: 4, LANDING: 5 };
    let playerState = PlayerState.IDLE;

    const jumpAnticipationTime = 120, landingTime = 80;
    const crouchAmount = 0.2, legBendAngle = Math.PI / 5;
    const armSpreadAngle = Math.PI / 8, armAnticipationAngle = -Math.PI / 6;
    let stateTimer = 0;

    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel;
    var cameraTargetPoint = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTargetPoint.parent = playerRoot;
    cameraTargetPoint.position.y = limbLength + torsoHeight / 2;

    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene);
    limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene);
    leftHipPivot.parent = playerRoot;
    leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene);
    rightHipPivot.parent = playerRoot;
    rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", { height: limbLength, width: limbThickness, depth: limbThickness }, scene);
    leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", { height: limbLength, width: limbThickness, depth: limbThickness }, scene);
    rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    var torso = BABYLON.MeshBuilder.CreateBox("torso", { height: torsoHeight, width: torsoWidth, depth: torsoDepth }, scene);
    torso.material = bodyMaterial; torso.parent = cameraTargetPoint; torso.position.y = 0;
    var head = BABYLON.MeshBuilder.CreateSphere("head", { diameter: headDiameter }, scene);
    head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2;
    const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene);
    leftShoulderPivot.parent = torso;
    leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene);
    rightShoulderPivot.parent = torso;
    rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", { height: limbLength, width: limbThickness, depth: limbThickness }, scene);
    leftArm.material = limbMaterial; leftArm.parent = leftShoulderPivot; leftArm.position.y = -limbLength / 2;
    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", { height: limbLength, width: limbThickness, depth: limbThickness }, scene);
    rightArm.material = limbMaterial; rightArm.parent = rightShoulderPivot; rightArm.position.y = -limbLength / 2;

    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));

    var playerSpeed = 0.08, gravity = -0.015, playerVerticalVelocity = 0;
    var jumpStrength = 0.25, isGrounded = true, maxJumps = 2, jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.3, sprintMultiplier = 2;
    var rotationLerpSpeed = 0.15, targetRotationY = 0; // <== теперь игрок смотрит вперёд (по -Z)

    var walkAnimAngle = 0, walkAnimSpeed = 0.15, walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // 🔧 Игрок теперь по умолчанию смотрит вперёд
    playerRoot.rotation.y = 0;

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " },
        function () {
            if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
            if (jumpsAvailable > 0 && (playerState === PlayerState.IDLE || playerState === PlayerState.WALKING || playerState === PlayerState.RUNNING || playerState === PlayerState.AIRBORNE)) {
                if (isGrounded) {
                    playerState = PlayerState.JUMP_ANTICIPATION; stateTimer = 0;
                } else if (playerState === PlayerState.AIRBORNE) {
                    playerVerticalVelocity = secondJumpStrength; jumpsAvailable--;
                }
            }
        }
    ));

    function lerpLimbsToZero(lerpFactor = 0.1) {
        leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
        rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
        leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, lerpFactor);
        rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, lerpFactor);
        leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
        rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
    }

    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime();

        if (playerState !== PlayerState.JUMP_ANTICIPATION) {
            playerVerticalVelocity += gravity * (deltaTime / 16.66);
        }
        playerRoot.position.y += playerVerticalVelocity * (deltaTime / 16.66);

        let wasGrounded = isGrounded;

        if (playerRoot.position.y < groundLevel && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            playerRoot.position.y = groundLevel; playerVerticalVelocity = 0; isGrounded = true;
            if (!wasGrounded && playerState === PlayerState.AIRBORNE) {
                playerState = PlayerState.LANDING; stateTimer = 0; jumpsAvailable = maxJumps;
            }
        } else if (playerState !== PlayerState.JUMP_ANTICIPATION) {
            isGrounded = false;
        }

        isMovingHorizontally = false;
        if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
            let moveDirection = new BABYLON.Vector3(0, 0, 0);
            let movingX = false, movingZ = false;
            if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { moveDirection.z = -1; movingZ = true; }
            if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { moveDirection.z = 1; movingZ = true; }
            if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { moveDirection.x = -1; movingX = true; }
            if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { moveDirection.x = 1; movingX = true; }
            isMovingHorizontally = movingX || movingZ;

            if (isMovingHorizontally) {
                moveDirection.normalize();
                targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);
                playerRoot.position.x += moveDirection.x * currentSpeed * (deltaTime / 16.66);
                playerRoot.position.z += moveDirection.z * currentSpeed * (deltaTime / 16.66);
                playerState = inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING;
            } else {
                playerState = PlayerState.IDLE;
            }

            playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed);
        }

        stateTimer += deltaTime;
        let targetTorsoOffsetY = 0; let targetLegBend = 0; let targetArmXAngle = 0; let targetArmZAngle = 0;

        switch (playerState) {
            case PlayerState.IDLE:
            case PlayerState.WALKING:
            case PlayerState.RUNNING:
                if (isMovingHorizontally) {
                    let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
                    walkAnimAngle += currentAnimSpeed * (deltaTime / 16.66);
                    targetArmXAngle = Math.sin(walkAnimAngle) * walkAnimAmplitude;
                    targetLegBend = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude;
                } else {
                    walkAnimAngle = 0; targetArmXAngle = 0; targetLegBend = 0;
                }

                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.2);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, -targetArmXAngle, 0.2);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, -targetLegBend, 0.2);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.2);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.2);
                break;

            case PlayerState.JUMP_ANTICIPATION:
                targetTorsoOffsetY = -crouchAmount;
                targetLegBend = legBendAngle;
                targetArmXAngle = armAnticipationAngle;
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.3);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, targetArmXAngle, 0.3);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.3);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.3);
                if (stateTimer >= jumpAnticipationTime) {
                    playerVerticalVelocity = (jumpsAvailable === maxJumps) ? jumpStrength : secondJumpStrength;
                    jumpsAvailable--; isGrounded = false;
                    playerState = PlayerState.AIRBORNE;
                    targetTorsoOffsetY = 0;
                }
                break;

            case PlayerState.AIRBORNE:
                targetLegBend = -legBendAngle / 2;
                targetArmZAngle = armSpreadAngle;
                lerpLimbsToZero(0.1);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.15);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, -targetArmZAngle, 0.15);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.15);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.15);
                break;

            case PlayerState.LANDING:
                targetTorsoOffsetY = -crouchAmount * 0.7;
                targetLegBend = legBendAngle * 0.8;
                lerpLimbsToZero(0.25);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.25);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.25);
                if (stateTimer >= landingTime) {
                    playerState = isMovingHorizontally ? PlayerState.WALKING : PlayerState.IDLE;
                    targetTorsoOffsetY = 0;
                }
                break;
        }

        torso.position.y = BABYLON.Scalar.Lerp(torso.position.y, targetTorsoOffsetY, 0.2);
    });

    return { root: playerRoot, cameraTarget: cameraTargetPoint };
}

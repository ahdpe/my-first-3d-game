// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0, torsoWidth = 0.5, torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8, limbThickness = 0.2;
    const groundLevel = 0;

    // --- СОСТОЯНИЯ ИГРОКА ---
    const PlayerState = { IDLE: 0, WALKING: 1, RUNNING: 2, JUMP_ANTICIPATION: 3, AIRBORNE: 4, LANDING: 5 };
    let playerState = PlayerState.IDLE;

    // --- ПАРАМЕТРЫ АНИМАЦИИ ПРЫЖКА ---
    const jumpAnticipationTime = 120, landingTime = 80;
    const crouchAmount = 0.2, legBendAngle = Math.PI / 5;
    const armSpreadAngle = Math.PI / 8, armAnticipationAngle = -Math.PI / 6;
    let stateTimer = 0;

    // --- КОРНЕВОЙ УЗЕЛ и ЦЕЛЬ КАМЕРЫ ---
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel;
    var cameraTargetPoint = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTargetPoint.parent = playerRoot;
    cameraTargetPoint.position.y = limbLength + torsoHeight / 2;

    // --- МАТЕРИАЛЫ ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene); bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene); limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИЕРАРХИЯ ---
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene); leftHipPivot.parent = playerRoot; leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene); rightHipPivot.parent = playerRoot; rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene); torso.material = bodyMaterial; torso.parent = cameraTargetPoint; torso.position.y = 0;
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene); head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2; const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene); leftShoulderPivot.parent = torso; leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene); rightShoulderPivot.parent = torso; rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftArm.material = limbMaterial; leftArm.parent = leftShoulderPivot; leftArm.position.y = -limbLength / 2;
    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightArm.material = limbMaterial; rightArm.parent = rightShoulderPivot; rightArm.position.y = -limbLength / 2;

    // --- УПРАВЛЕНИЕ ---
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = true; }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = false; }));

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ ---
    var playerSpeed = 0.08, gravity = -0.015, playerVerticalVelocity = 0;
    var jumpStrength = 0.25, isGrounded = true, maxJumps = 2, jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.3, sprintMultiplier = 2;
    var rotationLerpSpeed = 0.15, targetRotationY = 0; // Начальное вращение 0 (вперед по Z)

    // --- ПЕРЕМЕННЫЕ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0, walkAnimSpeed = 0.15, walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // --- ИНИЦИАЛИЗАЦИЯ ---
    playerRoot.rotation.y = targetRotationY;

    // --- ОБРАБОТКА ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " }, // Пробел
        function (evt) {
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

    // --- ПЛАВНЫЙ СБРОС АНИМАЦИИ КОНЕЧНОСТЕЙ ---
    function lerpLimbsToZero(lerpFactor = 0.1) {
        leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
        rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
        leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, lerpFactor);
        rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, lerpFactor);
        leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
        rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
    }

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР ---
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime();
        const dt = deltaTime / 16.66; // Нормализация к 60 FPS

        // 1. Гравитация и вертикальное движение
        if (playerState !== PlayerState.JUMP_ANTICIPATION) {
            playerVerticalVelocity += gravity * dt;
        }
        playerRoot.position.y += playerVerticalVelocity * dt;

        // --- Общая логика ---
        let wasGrounded = isGrounded;

        // 2. Проверка земли и приземление
        if (playerRoot.position.y < groundLevel && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            playerRoot.position.y = groundLevel; playerVerticalVelocity = 0; isGrounded = true;
            if (!wasGrounded && playerState === PlayerState.AIRBORNE) {
                playerState = PlayerState.LANDING; stateTimer = 0; jumpsAvailable = maxJumps;
            } else if (playerState === PlayerState.AIRBORNE) {
                 playerState = PlayerState.IDLE; jumpsAvailable = maxJumps;
            }
        } else if (playerState !== PlayerState.JUMP_ANTICIPATION) {
            isGrounded = false;
            if (wasGrounded && playerState !== PlayerState.AIRBORNE && playerState !== PlayerState.LANDING) {
                 playerState = PlayerState.AIRBORNE;
            }
        }

        // =====================================================================
        // !!! НАЧАЛО ИЗМЕНЕНИЙ: Горизонтальное движение и поворот относительно камеры !!!
        // =====================================================================
        isMovingHorizontally = false;
        let worldMoveDirection = BABYLON.Vector3.Zero(); // Конечное направление движения в мировых координатах

        if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            const camera = scene.activeCamera; // Получаем активную камеру
            if (!camera) return; // Если камеры нет, ничего не делаем

            // Получаем вектор "вперед" камеры, проецируем на землю (обнуляем Y) и нормализуем
            let forward = camera.getForwardRay().direction;
            forward.y = 0;
            forward.normalize();

            // Получаем вектор "вправо" камеры (через векторное произведение с вектором "вверх")
            let right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward);
            // Нормализация right не строго обязательна, если forward и Y нормализованы и перпендикулярны

            // Определяем вектор ввода (input) на основе нажатых клавиш
            // Z - вперед/назад, X - влево/вправо (относительно камеры)
            let inputDirection = BABYLON.Vector3.Zero();
            if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { inputDirection.z = 1; }
            if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { inputDirection.z = -1; }
            if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { inputDirection.x = -1; } // Движение влево камеры
            if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { inputDirection.x = 1; } // Движение вправо камеры

            // Если есть ввод движения
            if (inputDirection.lengthSquared() > 0.01) { // Используем lengthSquared для эффективности
                isMovingHorizontally = true;
                inputDirection.normalize(); // Нормализуем вектор ввода

                // Рассчитываем конечное направление движения в МИРОВЫХ координатах:
                // Берем компонент ввода "вперед/назад" и умножаем на вектор "вперед" камеры
                // Берем компонент ввода "влево/вправо" и умножаем на вектор "вправо" камеры
                // Складываем их
                worldMoveDirection = forward.scale(inputDirection.z).add(right.scale(inputDirection.x));
                worldMoveDirection.normalize(); // Нормализуем итоговое направление движения

                // Рассчитываем целевой угол поворота персонажа, чтобы он смотрел туда, куда движется
                targetRotationY = Math.atan2(worldMoveDirection.x, worldMoveDirection.z);

                // Обновляем состояние игрока (ходьба или бег)
                playerState = inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING;

            } else {
                // Если ввода нет, движения нет
                isMovingHorizontally = false;
                playerState = PlayerState.IDLE;
                // worldMoveDirection остается (0, 0, 0)
            }

            // Применяем движение, если оно есть
            if (isMovingHorizontally) {
                let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
                // Используем addInPlace для изменения позиции playerRoot
                playerRoot.position.addInPlace(worldMoveDirection.scale(currentSpeed * dt));
            }

            // Плавно поворачиваем игрока к целевому углу (даже если он не движется, но клавиша поворота была нажата)
            playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed * dt);

        } else if (!isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            // Если в воздухе, но не прыгаем/не приземляемся, то это полет
            playerState = PlayerState.AIRBORNE;
            // Здесь можно добавить управление в воздухе, если нужно (по аналогии с землей, но с меньшей скоростью/контролем)
        }
        // =====================================================================
        // !!! КОНЕЦ ИЗМЕНЕНИЙ: Горизонтальное движение и поворот относительно камеры !!!
        // =====================================================================


        // 4. Логика состояний и анимаций (без изменений в этой части)
        stateTimer += deltaTime;
        let targetTorsoOffsetY = 0; let targetLegBend = 0; let targetArmXAngle = 0; let targetArmZAngle = 0;
        switch (playerState) {
            case PlayerState.IDLE:
                lerpLimbsToZero(0.1 * dt); walkAnimAngle = 0; break;
            case PlayerState.WALKING: case PlayerState.RUNNING:
                let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1); walkAnimAngle += currentAnimSpeed * dt;
                targetArmXAngle = Math.sin(walkAnimAngle) * walkAnimAmplitude; targetLegBend = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude;
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.2 * dt); rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, -targetArmXAngle, 0.2 * dt);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2 * dt); rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, -targetLegBend, 0.2 * dt);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.2 * dt); rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.2 * dt);
                break;
            case PlayerState.JUMP_ANTICIPATION:
                targetTorsoOffsetY = -crouchAmount; targetLegBend = legBendAngle; targetArmXAngle = armAnticipationAngle;
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dt); rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dt);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.3 * dt); rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.3 * dt);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.3 * dt); rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.3 * dt);
                if (stateTimer >= jumpAnticipationTime) {
                    playerVerticalVelocity = (jumpsAvailable === maxJumps) ? jumpStrength : secondJumpStrength; jumpsAvailable--; isGrounded = false; playerState = PlayerState.AIRBORNE; targetTorsoOffsetY = 0;
                } break;
            case PlayerState.AIRBORNE:
                targetLegBend = -legBendAngle / 2; targetArmZAngle = armSpreadAngle;
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, 0.1 * dt); rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, 0.1 * dt);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.15 * dt); rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, -targetArmZAngle, 0.15 * dt);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.15 * dt); rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.15 * dt);
                break;
            case PlayerState.LANDING:
                targetTorsoOffsetY = -crouchAmount * 0.7; targetLegBend = legBendAngle * 0.8; targetArmXAngle = 0; targetArmZAngle = 0;
                lerpLimbsToZero(0.25 * dt);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.25 * dt); rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.25 * dt);
                if (stateTimer >= landingTime) {
                    playerState = isMovingHorizontally ? (inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING) : PlayerState.IDLE; targetTorsoOffsetY = 0;
                } break;
        }
        torso.position.y = BABYLON.Scalar.Lerp(torso.position.y, targetTorsoOffsetY, 0.2 * dt);
    });

    // Возвращаем корневой узел и точку прицеливания камеры
    return {
        root: playerRoot,
        cameraTarget: cameraTargetPoint
    };
}

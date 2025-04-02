// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0, torsoWidth = 0.5, torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8, limbThickness = 0.2;
    const groundLevel = 0;

    // --- СОСТОЯНИЯ ИГРОКА ---
    const PlayerState = {
        IDLE: 0,
        WALKING: 1,
        RUNNING: 2,
        JUMP_ANTICIPATION: 3, // Подготовка (приседание)
        AIRBORNE: 4,          // В воздухе
        LANDING: 5            // Приземление
    };
    let playerState = PlayerState.IDLE;

    // --- ПАРАМЕТРЫ АНИМАЦИИ ПРЫЖКА ---
    const jumpAnticipationTime = 120; // мс (0.12 секунды)
    const landingTime = 80;          // мс (0.08 секунды)
    const crouchAmount = 0.2;        // Насколько приседает (смещение туловища вниз)
    const legBendAngle = Math.PI / 5;  // Угол сгиба ног при приседании/посадке
    const armSpreadAngle = Math.PI / 8; // Угол разведения рук в стороны в полете (по оси Z)
    const armAnticipationAngle = -Math.PI / 6; // Угол отвода рук назад при подготовке
    let stateTimer = 0; // Таймер для отслеживания длительности состояний ANTICIPATION и LANDING

    // --- КОРНЕВОЙ УЗЕЛ и ЦЕЛЬ КАМЕРЫ ---
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel;
    var cameraTargetPoint = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTargetPoint.parent = playerRoot;
    cameraTargetPoint.position.y = limbLength + torsoHeight / 2;

    // --- МАТЕРИАЛЫ ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene);
    limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИЕРАРХИЯ ---
    // Пивоты бедер
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene); leftHipPivot.parent = playerRoot; leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene); rightHipPivot.parent = playerRoot; rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    // Ноги
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    // Туловище (!!! Сделаем его дочерним к cameraTargetPoint, чтобы приседание не влияло на цель камеры)
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene);
    torso.material = bodyMaterial;
    torso.parent = cameraTargetPoint; // *** ИЗМЕНЕНО ***
    torso.position.y = 0; // *** ИЗМЕНЕНО *** Центр туловища совпадает с cameraTargetPoint

    // Голова
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene); head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    // Пивоты плеч
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2; const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene); leftShoulderPivot.parent = torso; leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene); rightShoulderPivot.parent = torso; rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    // Руки
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftArm.material = limbMaterial; leftArm.parent = leftShoulderPivot; leftArm.position.y = -limbLength / 2;
    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightArm.material = limbMaterial; rightArm.parent = rightShoulderPivot; rightArm.position.y = -limbLength / 2;


    // --- УПРАВЛЕНИЕ ---
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown"; }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown"; }));

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ ---
    var playerSpeed = 0.08, gravity = -0.015, playerVerticalVelocity = 0;
    var jumpStrength = 0.25, isGrounded = true, maxJumps = 2, jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.3, sprintMultiplier = 2;
    var rotationLerpSpeed = 0.15, targetRotationY = Math.PI;

    // --- ПЕРЕМЕННЫЕ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0, walkAnimSpeed = 0.15, walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // --- ИНИЦИАЛИЗАЦИЯ ---
    playerRoot.rotation.y = targetRotationY;

    // --- ОБРАБОТКА ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " },
        function () {
             if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

             // Начинаем прыжок, только если стоим или уже в воздухе (для двойного прыжка)
             if (jumpsAvailable > 0 && (playerState === PlayerState.IDLE || playerState === PlayerState.WALKING || playerState === PlayerState.RUNNING || playerState === PlayerState.AIRBORNE)) {
                 if (isGrounded) { // Первый прыжок с земли - с подготовкой
                     playerState = PlayerState.JUMP_ANTICIPATION;
                     stateTimer = 0; // Сброс таймера для подготовки
                 } else if (playerState === PlayerState.AIRBORNE) { // Двойной прыжок - без подготовки
                     playerVerticalVelocity = secondJumpStrength; // Сразу даем импульс
                     jumpsAvailable--;
                     // Можно добавить эффект частиц или звука для двойного прыжка
                 }
             }
        }
    ));

    // --- ПЛАВНЫЙ СБРОС АНИМАЦИИ КОНЕЧНОСТЕЙ ---
    function lerpLimbsToZero(lerpFactor = 0.1) {
        leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
        rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
        leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, lerpFactor); // Сброс разведения рук
        rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, lerpFactor); // Сброс разведения рук
        leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
        rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
    }


    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР ---
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = engine.getDeltaTime(); // Время с прошлого кадра в мс

        // 1. Гравитация
        if (playerState !== PlayerState.JUMP_ANTICIPATION) { // Не применяем гравитацию во время подготовки
           playerVerticalVelocity += gravity * (deltaTime / 16.66); // Нормализуем гравитацию к ~60fps
        }
        playerRoot.position.y += playerVerticalVelocity * (deltaTime / 16.66); // Нормализуем движение

        // --- Общая логика ---
        let wasGrounded = isGrounded; // Запоминаем, были ли на земле в прошлом кадре

        // 2. Проверка земли
        if (playerRoot.position.y < groundLevel && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            playerRoot.position.y = groundLevel;
            playerVerticalVelocity = 0;
            isGrounded = true;
            if (!wasGrounded && playerState === PlayerState.AIRBORNE) { // Только что приземлились из полета
                playerState = PlayerState.LANDING;
                stateTimer = 0; // Начинаем таймер приземления
                jumpsAvailable = maxJumps; // Восстанавливаем прыжки при касании земли
            }
        } else if (playerState !== PlayerState.JUMP_ANTICIPATION) { // Не считаемся в воздухе во время подготовки
            isGrounded = false;
        }

        // 3. Горизонтальное движение и поворот (только если не в спец. состояниях прыжка)
        isMovingHorizontally = false; // Сбрасываем флаг движения
        if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
             let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
             let moveDirection = new BABYLON.Vector3(0, 0, 0);
             let movingX = false, movingZ = false;

             if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { moveDirection.z = 1; movingZ = true; }
             if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { moveDirection.z = -1; movingZ = true; }
             if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { moveDirection.x = -1; movingX = true; }
             if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { moveDirection.x = 1; movingX = true; }

             isMovingHorizontally = movingX || movingZ;

             if (isMovingHorizontally) {
                 moveDirection.normalize();
                 targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);
                 playerRoot.position.x += moveDirection.x * currentSpeed * (deltaTime / 16.66);
                 playerRoot.position.z += moveDirection.z * currentSpeed * (deltaTime / 16.66);
                 playerState = inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING; // Обновляем состояние
             } else {
                 playerState = PlayerState.IDLE; // Стоим на месте
             }
             // Плавный поворот
             playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed);
        }


        // 4. Логика состояний и анимаций
        stateTimer += deltaTime; // Увеличиваем таймер состояния

        // Смещение туловища для приседания/посадки (плавно)
        let targetTorsoOffsetY = 0;
        let targetLegBend = 0;
        let targetArmXAngle = 0;
        let targetArmZAngle = 0;

        switch (playerState) {
            case PlayerState.IDLE:
            case PlayerState.WALKING:
            case PlayerState.RUNNING:
                // Анимация ходьбы/бега (если движемся)
                if (isMovingHorizontally) {
                    let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
                    walkAnimAngle += currentAnimSpeed * (deltaTime / 16.66);
                    targetArmXAngle = Math.sin(walkAnimAngle) * walkAnimAmplitude; // Для рук (противофаза будет ниже)
                    targetLegBend = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude; // Для ног
                } else {
                    // Если стоим - плавно возвращаем к нулю
                    walkAnimAngle = 0; // Сброс угла для начала ходьбы
                    targetArmXAngle = 0;
                    targetLegBend = 0;
                }
                // Применяем анимацию ходьбы/покоя плавно
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.2);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, -targetArmXAngle, 0.2); // Противофаза
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, -targetLegBend, 0.2); // Противофаза

                // Сброс бокового разведения рук
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.2);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.2);
                break;

            case PlayerState.JUMP_ANTICIPATION:
                targetTorsoOffsetY = -crouchAmount; // Приседаем
                targetLegBend = legBendAngle;      // Сгибаем ноги
                targetArmXAngle = armAnticipationAngle; // Руки назад

                // Применяем позу подготовки (быстро)
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.3);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, targetArmXAngle, 0.3); // Синхронно назад
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.3);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.3); // Синхронно согнуть

                // Сброс бокового разведения рук
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.3);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.3);

                if (stateTimer >= jumpAnticipationTime) {
                    // Время подготовки вышло - ПРЫГАЕМ!
                    playerVerticalVelocity = (jumpsAvailable === maxJumps) ? jumpStrength : secondJumpStrength; // Используем правильную силу
                    jumpsAvailable--;
                    isGrounded = false; // Точно в воздухе
                    playerState = PlayerState.AIRBORNE;
                    targetTorsoOffsetY = 0; // Возвращаем туловище (оно полетит вверх с playerRoot)
                }
                break;

            case PlayerState.AIRBORNE:
                targetLegBend = -legBendAngle / 2; // Ноги чуть согнуты назад
                targetArmZAngle = armSpreadAngle; // Руки разведены в стороны

                // Применяем позу полета (плавно)
                lerpLimbsToZero(0.1); // Сначала возвращаем к нулю предыдущую анимацию
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.15);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, -targetArmZAngle, 0.15); // В разные стороны
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.15);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.15);
                break;

            case PlayerState.LANDING:
                targetTorsoOffsetY = -crouchAmount * 0.7; // Приземляемся (чуть меньше приседание)
                targetLegBend = legBendAngle * 0.8;      // Сгибаем ноги
                // Руки можно просто вернуть в нейтральное положение
                targetArmXAngle = 0;
                targetArmZAngle = 0;

                 // Применяем позу посадки (быстро)
                lerpLimbsToZero(0.25); // Быстро сбрасываем предыдущую позу
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.25);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.25);

                if (stateTimer >= landingTime) {
                    // Время приземления вышло
                    playerState = isMovingHorizontally ? PlayerState.WALKING : PlayerState.IDLE; // Переходим в ходьбу или покой
                    targetTorsoOffsetY = 0; // Возвращаем туловище
                }
                break;
        }

        // Плавно применяем смещение туловища для приседания/посадки
        torso.position.y = BABYLON.Scalar.Lerp(torso.position.y, targetTorsoOffsetY, 0.2);

    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ ---

    return {
        root: playerRoot,
        cameraTarget: cameraTargetPoint
        // Можно добавить другие элементы для доступа извне, если нужно
    };
}

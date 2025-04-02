// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0;
    const torsoWidth = 0.5;
    const torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8;
    const limbThickness = 0.2;
    const groundLevel = 0;

    // --- КОРНЕВОЙ УЗЕЛ ПЕРСОНАЖА ---
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel;

    // --- ТОЧКА ЦЕЛИ ДЛЯ КАМЕРЫ ---
    // Пустой узел, привязанный к корню, но расположенный выше (на уровне туловища)
    // Камера будет смотреть на эту точку
    var cameraTargetPoint = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTargetPoint.parent = playerRoot;
    // Позиционируем примерно на уровне середины туловища
    cameraTargetPoint.position.y = limbLength + torsoHeight / 2;


    // --- ЧАСТИ ТЕЛА (МАТЕРИАЛЫ) ---
    // ... (остальной код создания материалов без изменений) ...
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene);
    limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИХ ИЕРАРХИЯ ---
    // ... (весь код создания пивотов, ног, туловища, головы, рук без изменений) ...
    // Пивоты бедер
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene);
    leftHipPivot.parent = playerRoot;
    leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene);
    rightHipPivot.parent = playerRoot;
    rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    // Ноги
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    // Туловище
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene);
    torso.material = bodyMaterial; torso.parent = playerRoot; torso.position.y = limbLength + torsoHeight / 2;
    // Голова
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene);
    head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    // Пивоты плеч
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2;
    const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene);
    leftShoulderPivot.parent = torso; leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene);
    rightShoulderPivot.parent = torso; rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    // Руки
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftArm.material = limbMaterial; leftArm.parent = leftShoulderPivot; leftArm.position.y = -limbLength / 2;
    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightArm.material = limbMaterial; rightArm.parent = rightShoulderPivot; rightArm.position.y = -limbLength / 2;


    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    // ... (без изменений) ...
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = true; }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) { inputMap[evt.sourceEvent.key.toLowerCase()] = false; }));

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА, ПОВОРОТА ---
    // ... (без изменений) ...
    var playerSpeed = 0.05;
    var gravity = -0.01;
    var playerVerticalVelocity = 0;
    var jumpStrength = 0.2;
    var isGrounded = true;
    var maxJumps = 2;
    var jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.25;
    var sprintMultiplier = 2;
    var rotationLerpSpeed = 0.1;
    var targetRotationY = 0; // Инициализируем начальное направление (вперед по Z)

    // --- ПЕРЕМЕННЫЕ ДЛЯ АНИМАЦИИ ХОДЬБЫ ---
    // ... (без изменений) ...
    var walkAnimAngle = 0;
    var walkAnimSpeed = 0.15;
    var walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // --- ИНИЦИАЛИЗАЦИЯ НАЧАЛЬНОГО ПОВОРОТА ---
    // Установим начальный поворот, чтобы персонаж смотрел, например, вперед (положительное Z)
    // Math.atan2(0, 1) == 0 радиан
    targetRotationY = Math.atan2(0, 1); // Вперед по Z
    playerRoot.rotation.y = targetRotationY;


    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
    // ... (без изменений) ...
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction({ trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " }, function () { /* ... код прыжка ... */
         if (document.activeElement && document.activeElement.tagName === "INPUT") return;
         if (jumpsAvailable > 0) {
             if (jumpsAvailable === 1) playerVerticalVelocity = secondJumpStrength; else playerVerticalVelocity = jumpStrength;
             jumpsAvailable--; isGrounded = false;
         }
    }));


    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР (Гравитация, Движение, Поворот, Анимация) ---
    scene.onBeforeRenderObservable.add(() => {
        // 1. Гравитация
        // ... (без изменений) ...
        playerVerticalVelocity += gravity;
        playerRoot.position.y += playerVerticalVelocity;

        // 2. Проверка земли
        // ... (без изменений) ...
        if (playerRoot.position.y < groundLevel) {
             playerRoot.position.y = groundLevel; playerVerticalVelocity = 0;
             if (!isGrounded) { jumpsAvailable = maxJumps; }
             isGrounded = true;
        } else { isGrounded = false; }


        // 3. Горизонтальное движение
        // ... (код определения moveDirection и isMovingHorizontally без изменений) ...
        let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
        let moveDirection = new BABYLON.Vector3(0, 0, 0);
        let movingX = false, movingZ = false;
        if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { moveDirection.z = 1; movingZ = true; }
        if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { moveDirection.z = -1; movingZ = true; }
        if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { moveDirection.x = -1; movingX = true; }
        if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { moveDirection.x = 1; movingX = true; }
        isMovingHorizontally = movingX || movingZ;


        // 4. Расчет целевого угла поворота и Движение
        if (isMovingHorizontally) {
            moveDirection.normalize();

            // Обновляем целевой угол ТОЛЬКО если есть движение
            targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);

            // Двигаем персонажа по мировым координатам
            playerRoot.position.x += moveDirection.x * currentSpeed;
            playerRoot.position.z += moveDirection.z * currentSpeed;
        }

        // 5. Плавный Поворот персонажа
        // ... (без изменений) ...
        playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed);


        // 6. Анимация Ходьбы/Бега
        // ... (без изменений) ...
        let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1);
        if (isMovingHorizontally && isGrounded) {
            walkAnimAngle += currentAnimSpeed;
            leftShoulderPivot.rotation.x = Math.sin(walkAnimAngle) * walkAnimAmplitude;
            rightShoulderPivot.rotation.x = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude;
            leftHipPivot.rotation.x = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude;
            rightHipPivot.rotation.x = Math.sin(walkAnimAngle) * walkAnimAmplitude;
        } else {
            const lerpFactor = 0.1;
            leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
            rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
            leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
            rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
            if (Math.abs(leftShoulderPivot.rotation.x) < 0.01) { walkAnimAngle = 0; }
        }

    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ КАЖДЫЙ КАДР ---

    // Возвращаем объект с корневым узлом и точкой цели для камеры
    return {
        root: playerRoot,
        cameraTarget: cameraTargetPoint
    };
}

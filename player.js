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
    cameraTargetPoint.position.y = limbLength + torsoHeight / 2; // Позиционируем чуть выше ног

    // --- МАТЕРИАЛЫ ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene); bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene); limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИЕРАРХИЯ ---
    // Пивоты для ног (в корневом узле)
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene); leftHipPivot.parent = playerRoot; leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene); rightHipPivot.parent = playerRoot; rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    // Ноги (привязаны к пивотам бедер)
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    // Туловище (привязано к цели камеры, которая в корневом узле)
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene); torso.material = bodyMaterial; torso.parent = cameraTargetPoint; torso.position.y = 0; // Центр туловища совпадает с cameraTargetPoint
    // Голова (привязана к туловищу)
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene); head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    // Пивоты для рук (в туловище)
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2; const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene); leftShoulderPivot.parent = torso; leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene); rightShoulderPivot.parent = torso; rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    // Руки (привязаны к пивотам плеч)
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
    // ==============================================================
    // !!! ИЗМЕНЕНИЕ ЗДЕСЬ: Начальное направление игрока !!!
    // Устанавливаем начальное вращение 0 (вдоль положительной оси Z)
    var rotationLerpSpeed = 0.15, targetRotationY = 0;
    // ==============================================================

    // --- ПЕРЕМЕННЫЕ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0, walkAnimSpeed = 0.15, walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // --- ИНИЦИАЛИЗАЦИЯ ---
    // ==============================================================
    // !!! ИЗМЕНЕНИЕ ЗДЕСЬ: Применяем начальное вращение !!!
    playerRoot.rotation.y = targetRotationY; // Теперь равно 0
    // ==============================================================

    // --- ОБРАБОТКА ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " }, // Пробел
        function (evt) {
            // Предотвращаем прыжок, если фокус на элементе ввода
            if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
                return;
            }
            // Логика прыжка
            if (jumpsAvailable > 0 && (playerState === PlayerState.IDLE || playerState === PlayerState.WALKING || playerState === PlayerState.RUNNING || playerState === PlayerState.AIRBORNE)) {
                if (isGrounded) { // Первый прыжок с земли
                    playerState = PlayerState.JUMP_ANTICIPATION; stateTimer = 0;
                    // Прыжок произойдет после анимации предвкушения
                } else if (playerState === PlayerState.AIRBORNE) { // Второй прыжок в воздухе
                    playerVerticalVelocity = secondJumpStrength;
                    jumpsAvailable--;
                    // Небольшая анимация или эффект для второго прыжка (по желанию)
                    // Например, можно сбросить вращение ног/рук или добавить партиклы
                }
            }
        }
    ));

    // --- ПЛАВНЫЙ СБРОС АНИМАЦИИ КОНЕЧНОСТЕЙ ---
    function lerpLimbsToZero(lerpFactor = 0.1) {
        // Используем Lerp для плавного возврата к нулевому вращению
        leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
        rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
        leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, lerpFactor);
        rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, lerpFactor);
        leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
        rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
    }

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР ---
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime(); // Время с прошлого кадра в мс
        const dt = deltaTime / 16.66; // Нормализация к 60 FPS (приблизительно)

        // 1. Гравитация и вертикальное движение
        // Не применяем гравитацию в момент подготовки к прыжку
        if (playerState !== PlayerState.JUMP_ANTICIPATION) {
            playerVerticalVelocity += gravity * dt; // Применяем гравитацию
        }
        playerRoot.position.y += playerVerticalVelocity * dt; // Обновляем позицию по Y

        // --- Общая логика ---
        let wasGrounded = isGrounded; // Запоминаем, были ли на земле в прошлом кадре

        // 2. Проверка земли и приземление
        // Если игрок ниже уровня земли и не в фазе подготовки к прыжку или приземления
        if (playerRoot.position.y < groundLevel && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            playerRoot.position.y = groundLevel;    // Ставим на землю
            playerVerticalVelocity = 0;             // Обнуляем вертикальную скорость
            isGrounded = true;                      // Игрок на земле

            // Если только что приземлились (были в воздухе)
            if (!wasGrounded && playerState === PlayerState.AIRBORNE) {
                playerState = PlayerState.LANDING; // Переходим в состояние приземления
                stateTimer = 0;                   // Сбрасываем таймер состояния
                jumpsAvailable = maxJumps;         // Восстанавливаем все прыжки
            }
            // Если просто стоим/идем по земле, а не приземлились только что
            else if (playerState === PlayerState.AIRBORNE) { // Если были в воздухе, но не приземлились (редкий случай, но возможный)
                 playerState = PlayerState.IDLE; // Переходим в ожидание
                 jumpsAvailable = maxJumps;
            }

        } else if (playerState !== PlayerState.JUMP_ANTICIPATION) { // Если не на земле И не готовимся к прыжку
            isGrounded = false; // Значит, в воздухе
            if (wasGrounded && playerState !== PlayerState.AIRBORNE && playerState !== PlayerState.LANDING) {
                // Если только что оторвались от земли (например, сошли с уступа) и еще не прыгаем/не приземляемся
                 playerState = PlayerState.AIRBORNE; // Переходим в состояние полета
                 // Важно: не сбрасываем jumpsAvailable здесь, если это не был прыжок
            }
        }

        // 3. Горизонтальное движение и поворот (только на земле, не в прыжке/приземлении)
        isMovingHorizontally = false; // Сбрасываем флаг движения по умолчанию
        let moveDirection = BABYLON.Vector3.Zero(); // Вектор направления движения

        if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1); // Учитываем бег (Shift)
            let movingX = false, movingZ = false;

            // Определяем направление по нажатым клавишам
            if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { moveDirection.z = 1; movingZ = true; }
            if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { moveDirection.z = -1; movingZ = true; }
            if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { moveDirection.x = -1; movingX = true; }
            if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { moveDirection.x = 1; movingX = true; }

            isMovingHorizontally = movingX || movingZ; // Двигаемся, если нажата хоть одна клавиша направления

            if (isMovingHorizontally) {
                // Нормализуем вектор, чтобы движение по диагонали не было быстрее
                moveDirection.normalize();

                // Рассчитываем целевой угол поворота на основе направления движения
                targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);

                // Двигаем игрока
                playerRoot.position.x += moveDirection.x * currentSpeed * dt;
                playerRoot.position.z += moveDirection.z * currentSpeed * dt;

                // Обновляем состояние игрока (ходьба или бег)
                playerState = inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING;
            } else {
                // Если нет движения, переходим в состояние ожидания
                playerState = PlayerState.IDLE;
            }

            // Плавно поворачиваем игрока к целевому углу
            playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed * dt); // Умножаем на dt для независимости от FPS
        } else if (!isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
            // Если в воздухе, но не прыгаем/не приземляемся, то это полет
            playerState = PlayerState.AIRBORNE;
            // Можно добавить управление в воздухе, если нужно
        }

        // 4. Логика состояний и анимаций
        stateTimer += deltaTime; // Увеличиваем таймер текущего состояния

        let targetTorsoOffsetY = 0; // Целевое смещение туловища по Y (для приседаний)
        let targetLegBend = 0;      // Целевой угол сгиба ног
        let targetArmXAngle = 0;    // Целевой угол маха рук (вперед/назад)
        let targetArmZAngle = 0;    // Целевой угол разведения рук (в стороны)

        switch (playerState) {
            case PlayerState.IDLE:
                // В покое плавно возвращаем все конечности в исходное положение
                lerpLimbsToZero(0.1 * dt); // Замедляем возврат для плавности
                walkAnimAngle = 0; // Сбрасываем угол анимации ходьбы
                break;

            case PlayerState.WALKING:
            case PlayerState.RUNNING:
                // Анимация ходьбы/бега
                let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1); // Скорость анимации зависит от бега
                walkAnimAngle += currentAnimSpeed * dt; // Увеличиваем угол анимации

                // Рассчитываем целевые углы для рук и ног на основе синусоиды
                targetArmXAngle = Math.sin(walkAnimAngle) * walkAnimAmplitude;
                targetLegBend = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude; // Ноги двигаются в противофазе рукам

                // Плавно двигаем конечности к целевым углам
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.2 * dt);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, -targetArmXAngle, 0.2 * dt); // Правая рука в противофазе левой
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2 * dt);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, -targetLegBend, 0.2 * dt); // Правая нога в противофазе левой

                // Возвращаем вращение по Z (разведение рук) к нулю
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.2 * dt);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.2 * dt);
                break;

            case PlayerState.JUMP_ANTICIPATION:
                // Анимация подготовки к прыжку (приседание)
                targetTorsoOffsetY = -crouchAmount;       // Смещаем туловище вниз
                targetLegBend = legBendAngle;           // Сгибаем ноги
                targetArmXAngle = armAnticipationAngle; // Отводим руки назад

                // Плавно применяем анимацию подготовки
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dt);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dt); // Обе руки назад
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.3 * dt);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.3 * dt); // Обе ноги сгибаем
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.3 * dt);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.3 * dt);

                // Когда время подготовки вышло, выполняем прыжок
                if (stateTimer >= jumpAnticipationTime) {
                    // Придаем вертикальную скорость (разная для первого и второго прыжка)
                    playerVerticalVelocity = (jumpsAvailable === maxJumps) ? jumpStrength : secondJumpStrength; // Используем secondJumpStrength если это был второй прыжок (хотя сюда мы попадаем только с первого)
                    jumpsAvailable--; // Тратим один прыжок
                    isGrounded = false; // Игрок больше не на земле
                    playerState = PlayerState.AIRBORNE; // Переходим в состояние полета
                    targetTorsoOffsetY = 0; // Возвращаем туловище на место (анимация подъема будет в AIRBORNE)
                }
                break;

            case PlayerState.AIRBORNE:
                // Анимация в полете
                targetLegBend = -legBendAngle / 2; // Немного поджимаем ноги
                targetArmZAngle = armSpreadAngle; // Слегка разводим руки для баланса

                // Плавно возвращаем махи руками к нулю (если были)
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, 0.1 * dt);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, 0.1 * dt);

                // Применяем анимацию полета
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.15 * dt);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, -targetArmZAngle, 0.15 * dt); // Руки в стороны
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.15 * dt);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.15 * dt); // Обе ноги поджаты
                break;

            case PlayerState.LANDING:
                // Анимация приземления (легкое приседание)
                targetTorsoOffsetY = -crouchAmount * 0.7; // Слегка приседаем
                targetLegBend = legBendAngle * 0.8;     // Слегка сгибаем ноги
                targetArmXAngle = 0;                    // Руки не машут
                targetArmZAngle = 0;                    // Руки не разведены

                // Плавно возвращаем все вращения к целевым (присед)
                lerpLimbsToZero(0.25 * dt); // Быстрее возвращаем махи
                // Применяем легкий присед ногами
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.25 * dt);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.25 * dt);

                // Когда время анимации приземления вышло
                if (stateTimer >= landingTime) {
                    // Переходим в следующее состояние (ожидание или ходьба/бег, если кнопки нажаты)
                    playerState = isMovingHorizontally ? (inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING) : PlayerState.IDLE;
                    targetTorsoOffsetY = 0; // Возвращаем туловище на место
                }
                break;
        }

        // Плавно применяем смещение туловища по Y (для приседаний)
        torso.position.y = BABYLON.Scalar.Lerp(torso.position.y, targetTorsoOffsetY, 0.2 * dt);
    });

    // Возвращаем корневой узел и точку прицеливания камеры
    return {
        root: playerRoot,
        cameraTarget: cameraTargetPoint
    };
}

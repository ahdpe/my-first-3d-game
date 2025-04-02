// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0;
    const torsoWidth = 0.5;
    const torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8; // Длина рук и ног
    const limbThickness = 0.2; // Толщина рук и ног
    const groundLevel = 0; // Уровень земли

    // --- КОРНЕВОЙ УЗЕЛ ПЕРСОНАЖА ---
    // Теперь playerRoot.position.y будет означать точку ОПОРЫ персонажа (уровень стоп)
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel; // Ставим точку опоры на землю

    // --- ЧАСТИ ТЕЛА (МАТЕРИАЛЫ) ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9); // Синеватый

    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene);
    limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6); // Розоватый

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИХ ИЕРАРХИЯ ---
    // Координаты Y теперь отсчитываются от playerRoot (уровня стоп)

    // 1. Пивоты бедер (Hip Pivots) - точка вращения ног
    // Находятся на высоте длины ноги над точкой опоры
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene);
    leftHipPivot.parent = playerRoot;
    leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0); // Ноги ближе к центру

    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene);
    rightHipPivot.parent = playerRoot;
    rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);

    // 2. Ноги (Legs) - крепятся к пивотам бедер
    // Центр ноги смещен на -limbLength / 2 относительно пивота, чтобы вращение было от бедра
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftLeg.material = limbMaterial;
    leftLeg.parent = leftHipPivot;
    leftLeg.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightLeg.material = limbMaterial;
    rightLeg.parent = rightHipPivot;
    rightLeg.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    // 3. Туловище (Torso) - его центр находится выше бедер на половину своей высоты
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene);
    torso.material = bodyMaterial;
    torso.parent = playerRoot; // Привязываем к корневому узлу для простоты позиционирования
    // Позиция Y центра туловища = высота ног + половина высоты туловища
    torso.position.y = limbLength + torsoHeight / 2;

    // 4. Голова (Head) - крепится к туловищу
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene);
    head.material = limbMaterial;
    head.parent = torso; // Привязываем к туловищу
    // Позиция Y головы = половина высоты туловища + половина диаметра головы (относительно центра туловища)
    head.position.y = torsoHeight / 2 + headDiameter / 2;

    // 5. Пивоты плеч (Shoulder Pivots) - крепятся к туловищу
    // Рассчитываем позицию относительно центра туловища
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2; // Верх туловища минус половина толщины руки
    const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2; // Сбоку от туловища плюс половина толщины руки

    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene);
    leftShoulderPivot.parent = torso; // Крепим к туловищу
    leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);

    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene);
    rightShoulderPivot.parent = torso; // Крепим к туловищу
    rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);

    // 6. Руки (Arms) - крепятся к пивотам плеч
    // Центр руки смещен на -limbLength / 2 относительно пивота плеча
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftArm.material = limbMaterial;
    leftArm.parent = leftShoulderPivot; // Привязываем к пивоту плеча
    leftArm.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightArm.material = limbMaterial;
    rightArm.parent = rightShoulderPivot; // Привязываем к пивоту плеча
    rightArm.position.y = -limbLength / 2; // Смещаем вниз от точки вращения


    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    }));

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));
    // ---------------------------------------------

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА, ПОВОРОТА ---
    var playerSpeed = 0.05;
    var gravity = -0.01;
    var playerVerticalVelocity = 0;
    var jumpStrength = 0.2;
    var isGrounded = true;
    var maxJumps = 2;
    var jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.25;
    var sprintMultiplier = 2;
    var rotationLerpSpeed = 0.1; // Скорость плавного поворота (0 до 1)
    var targetRotationY = 0;     // Целевой угол поворота по Y
    // ----------------------------------------

    // --- ПЕРЕМЕННЫЕ ДЛЯ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0;
    var walkAnimSpeed = 0.15;
    var walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;
    // --------------------------------------

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        {
            trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            parameter: " " // Пробел
        },
        function () {
             if (document.activeElement && document.activeElement.tagName === "INPUT") {
                return;
            }
            if (jumpsAvailable > 0) {
                if (jumpsAvailable === 1) {
                    playerVerticalVelocity = secondJumpStrength;
                } else {
                    playerVerticalVelocity = jumpStrength;
                }
                jumpsAvailable--;
                isGrounded = false;
            }
        }
    ));
    // -------------------------------------------

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР (Гравитация, Движение, Поворот, Анимация) ---
    scene.onBeforeRenderObservable.add(() => {
        // 1. Гравитация
        playerVerticalVelocity += gravity;
        playerRoot.position.y += playerVerticalVelocity;

        // 2. Проверка земли и сброс прыжков
        if (playerRoot.position.y < groundLevel) { // Теперь проверка корректна
            playerRoot.position.y = groundLevel;
            playerVerticalVelocity = 0;
            if (!isGrounded) {
                jumpsAvailable = maxJumps;
            }
            isGrounded = true;
        } else {
            isGrounded = false;
        }

        // 3. Горизонтальное движение (с бегом)
        let currentSpeed = playerSpeed;
        if (inputMap["shift"]) {
            currentSpeed *= sprintMultiplier;
        }

        let moveDirection = new BABYLON.Vector3(0, 0, 0);
        let movingX = false;
        let movingZ = false;

        if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) {
            moveDirection.z = 1;
            movingZ = true;
        }
        if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) {
            moveDirection.z = -1;
            movingZ = true;
        }
        if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) {
            moveDirection.x = -1;
            movingX = true;
        }
        if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) {
            moveDirection.x = 1;
            movingX = true;
        }

        isMovingHorizontally = movingX || movingZ;

        // Нормализуем вектор, чтобы диагональное движение не было быстрее
        // И применяем скорость
        if (isMovingHorizontally) {
            moveDirection.normalize();

            // 4. Расчет целевого угла поворота
            // Используем atan2 для получения угла вектора движения в плоскости XZ
            targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);

            // Двигаем персонажа В ЛОКАЛЬНЫХ КООРДИНАТАХ (вперед относительно его текущего поворота)
            // Для этого нам нужен повернутый вектор
            // Создаем кватернион поворота
            // var targetQuaternion = BABYLON.Quaternion.FromEulerAngles(0, targetRotationY, 0);
            // playerRoot.rotationQuaternion = BABYLON.Quaternion.Slerp(playerRoot.rotationQuaternion || BABYLON.Quaternion.Identity(), targetQuaternion, rotationLerpSpeed);

            // ИЛИ Простой способ: двигать по мировым координатам, поворачивать отдельно
            playerRoot.position.x += moveDirection.x * currentSpeed;
            playerRoot.position.z += moveDirection.z * currentSpeed;

        }

        // 5. Плавный Поворот персонажа (даже если не движемся, чтобы завершить поворот)
        // Используем LerpAngle для корректной интерполяции углов (обрабатывает переход через 360/0 градусов)
        playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(
            playerRoot.rotation.y,
            targetRotationY, // Целевой угол (обновляется только при движении)
            rotationLerpSpeed
        );


        // 6. Анимация Ходьбы/Бега
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

            if (Math.abs(leftShoulderPivot.rotation.x) < 0.01) {
                walkAnimAngle = 0;
            }
        }
        // --- Конец Анимации ---

    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ КАЖДЫЙ КАДР ---

    // Возвращаем КОРНЕВОЙ УЗЕЛ игрока.
    return playerRoot;
}

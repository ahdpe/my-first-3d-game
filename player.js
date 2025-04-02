// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- КОРНЕВОЙ УЗЕЛ ПЕРСОНАЖА ---
    // Создаем пустой TransformNode как родительский объект для всех частей тела.
    // Именно ЭТОТ узел мы будем двигать, применять гравитацию и т.д.
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = 1; // Начальная позиция над землей (высота туловища/2 + высота ног/2)

    // --- ЧАСТИ ТЕЛА (МАТЕРИАЛЫ И РАЗМЕРЫ) ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9); // Синеватый

    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene);
    limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6); // Розоватый

    const torsoHeight = 1.0;
    const torsoWidth = 0.5;
    const torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8; // Длина рук и ног
    const limbThickness = 0.2; // Толщина рук и ног

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИХ ИЕРАРХИЯ ---

    // 1. Туловище (Torso) - основной элемент, к которому крепится остальное
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene);
    torso.material = bodyMaterial;
    torso.parent = playerRoot; // Привязываем к корневому узлу
    // Располагаем туловище так, чтобы его низ был примерно там, где ноги крепятся
    torso.position.y = limbLength / 2; // Смещаем вверх на половину длины ног

    // 2. Голова (Head)
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene);
    head.material = limbMaterial; // Используем цвет конечностей для контраста
    head.parent = torso; // Привязываем к туловищу
    head.position.y = torsoHeight / 2 + headDiameter / 2; // Ставим на туловище

    // --- Пивоты (Точки вращения) для конечностей ---
    // Мы будем вращать эти узлы, а не сами конечности, для правильного "сустава"
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2;
    const shoulderOffsetX = torsoWidth / 2;
    const hipOffsetY = -torsoHeight / 2 + limbLength / 2; // От низа туловища
    const hipOffsetX = torsoWidth / 4; // Ноги ближе к центру

    // Пивоты плеч
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene);
    leftShoulderPivot.parent = torso;
    leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);

    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene);
    rightShoulderPivot.parent = torso;
    rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);

    // Пивоты бедер
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene);
    leftHipPivot.parent = torso;
    leftHipPivot.position = new BABYLON.Vector3(-hipOffsetX, hipOffsetY, 0);

    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene);
    rightHipPivot.parent = torso;
    rightHipPivot.position = new BABYLON.Vector3(hipOffsetX, hipOffsetY, 0);

    // 3. Руки (Arms)
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftArm.material = limbMaterial;
    leftArm.parent = leftShoulderPivot; // Привязываем к пивоту плеча
    leftArm.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightArm.material = limbMaterial;
    rightArm.parent = rightShoulderPivot; // Привязываем к пивоту плеча
    rightArm.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    // 4. Ноги (Legs)
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    leftLeg.material = limbMaterial;
    leftLeg.parent = leftHipPivot; // Привязываем к пивоту бедра
    leftLeg.position.y = -limbLength / 2; // Смещаем вниз от точки вращения

    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene);
    rightLeg.material = limbMaterial;
    rightLeg.parent = rightHipPivot; // Привязываем к пивоту бедра
    rightLeg.position.y = -limbLength / 2; // Смещаем вниз от точки вращения


    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true; // Приводим к нижнему регистру для надежности
    }));

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));
    // ---------------------------------------------

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА ---
    var playerSpeed = 0.05; // Сделал чуть медленнее для наглядности анимации
    var gravity = -0.01;
    var playerVerticalVelocity = 0;
    var jumpStrength = 0.2;
    var isGrounded = true;
    var maxJumps = 2;
    var jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.25;
    var sprintMultiplier = 2;
    const groundLevel = 0; // Уровень земли
    const characterHeightOffset = limbLength / 2; // Расстояние от playerRoot (на земле) до низа туловища
    // ----------------------------------------

    // --- ПЕРЕМЕННЫЕ ДЛЯ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0; // Угол для синусоиды анимации
    var walkAnimSpeed = 0.15; // Скорость анимации
    var walkAnimAmplitude = Math.PI / 6; // Максимальный угол размаха рук/ног (30 градусов)
    var isMovingHorizontally = false;
    // --------------------------------------

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        {
            trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            parameter: " " // Пробел
        },
        function () {
            // Проверяем, не вводится ли текст в каком-нибудь поле
             if (document.activeElement && document.activeElement.tagName === "INPUT") {
                return;
            }
            if (jumpsAvailable > 0) {
                if (jumpsAvailable === 1) { // Второй прыжок
                    playerVerticalVelocity = secondJumpStrength;
                } else { // Первый прыжок
                    playerVerticalVelocity = jumpStrength;
                }
                jumpsAvailable--; // Тратим прыжок
                isGrounded = false; // В воздухе после прыжка
            }
        }
    ));
    // -------------------------------------------

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР (Гравитация, Движение, Анимация) ---
    scene.onBeforeRenderObservable.add(() => {
        // Гравитация
        playerVerticalVelocity += gravity;
        playerRoot.position.y += playerVerticalVelocity; // Двигаем корневой узел

        // Проверка земли и сброс прыжков
        if (playerRoot.position.y < groundLevel) { // Если упали ниже уровня земли
            playerRoot.position.y = groundLevel;   // Ставим точно на землю
            playerVerticalVelocity = 0;
            if (!isGrounded) { // Если только что приземлились
                jumpsAvailable = maxJumps; // Восстанавливаем прыжки
            }
            isGrounded = true;
        } else {
            isGrounded = false; // Если в воздухе - не на земле
        }

        // Горизонтальное движение (с бегом)
        let currentSpeed = playerSpeed;
        if (inputMap["shift"]) {
            currentSpeed *= sprintMultiplier;
        }

        // Определяем, есть ли горизонтальное движение в этом кадре
        let movingX = false;
        let movingZ = false;

        // Вектор движения (чтобы двигаться по диагонали с той же скоростью)
        let moveDirection = new BABYLON.Vector3(0, 0, 0);

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

        isMovingHorizontally = movingX || movingZ; // Обновляем флаг движения

        // Нормализуем вектор, чтобы диагональное движение не было быстрее
        if (movingX && movingZ) {
            moveDirection.normalize();
        }

        // Двигаем персонажа
        playerRoot.position.x += moveDirection.x * currentSpeed;
        playerRoot.position.z += moveDirection.z * currentSpeed;


        // --- Анимация Ходьбы/Бега ---
        let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1);

        if (isMovingHorizontally && isGrounded) {
            // Если движемся по земле - анимируем
            walkAnimAngle += currentAnimSpeed; // Увеличиваем угол анимации

            // Вращаем пивоты конечностей по синусоиде
            leftShoulderPivot.rotation.x = Math.sin(walkAnimAngle) * walkAnimAmplitude;
            rightShoulderPivot.rotation.x = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude; // Противофаза
            leftHipPivot.rotation.x = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude; // Ноги в противофазе с руками
            rightHipPivot.rotation.x = Math.sin(walkAnimAngle) * walkAnimAmplitude;

        } else {
            // Если стоим или в воздухе - плавно возвращаем конечности в нейтральное положение
            const lerpFactor = 0.1; // Скорость возврата
            leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
            rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
            leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
            rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);

            // Сбрасываем угол, чтобы при старте движения анимация начиналась сначала
            if (Math.abs(leftShoulderPivot.rotation.x) < 0.01) { // Когда почти вернулись
                walkAnimAngle = 0;
            }
        }
        // --- Конец Анимации ---

    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ КАЖДЫЙ КАДР ---

    // Возвращаем КОРНЕВОЙ УЗЕЛ игрока. Камера и другие системы должны следить за ним.
    return playerRoot;
}

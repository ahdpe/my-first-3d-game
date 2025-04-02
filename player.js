// player.js: Отвечает за создание игрока и управление им

// !!! ВАЖНО: Функция теперь асинхронная (async) !!!
async function createPlayer(scene) {

    // --- ЗАГРУЗКА МОДЕЛИ ---
    // Загружаем модель. Замените "assets/character.glb" на ваш путь к файлу.
    // Создайте папку 'assets' рядом с index.html и положите туда .glb файл.
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "", // Оставляем пустым, чтобы загрузить все меши из файла
        "assets/", // Путь к папке с ресурсами
        "character.glb", // Имя вашего файла модели
        scene
    );

    // result содержит:
    // result.meshes - массив загруженных мешей (частей модели)
    // result.particleSystems - системы частиц (если есть)
    // result.skeletons - скелеты (для анимации)
    // result.animationGroups - ГРУППЫ АНИМАЦИЙ (самое важное для нас!)

    // Находим корневой меш персонажа. Часто он первый или имеет имя __root__
    const player = result.meshes[0];
    player.name = "playerCharacter"; // Дадим понятное имя

    // Масштабируем, если нужно (модели бывают разного размера)
    // player.scaling.scaleInPlace(0.1); // Пример: уменьшить в 10 раз

    // Ставим на землю (начальная позиция). Y=0.5 для сферы, для модели может быть 0 или другое значение,
    // зависящее от того, где у модели "ноги" относительно ее центра (origin). Подберите экспериментально.
    player.position = new BABYLON.Vector3(0, 0, 0);

    // --- ПОЛУЧАЕМ АНИМАЦИИ ---
    // Выведем имена загруженных анимаций в консоль, чтобы знать, как их называть
    console.log("Загруженные анимации:");
    result.animationGroups.forEach(ag => console.log("- " + ag.name));

    // Найдем нужные анимации по ИХ ИМЕНАМ ВНУТРИ .GLB ФАЙЛА
    // Замените "IdleAnimName", "WalkAnimName" и т.д. на реальные имена из консоли
    const idleAnim = scene.getAnimationGroupByName("IdleAnimName"); // <<--- ЗАМЕНИТЬ
    const walkAnim = scene.getAnimationGroupByName("WalkAnimName"); // <<--- ЗАМЕНИТЬ
    const runAnim = scene.getAnimationGroupByName("RunAnimName");   // <<--- ЗАМЕНИТЬ
    const jumpAnim = scene.getAnimationGroupByName("JumpAnimName"); // <<--- ЗАМЕНИТЬ (может не быть, или быть сложнее)

    // Останавливаем все анимации по умолчанию и запускаем Idle
    result.animationGroups.forEach(ag => ag.stop());
    let currentAnim = idleAnim; // Храним текущую активную анимацию
    if (currentAnim) {
        currentAnim.start(true, 1.0, currentAnim.from, currentAnim.to, false); // Запускаем зацикленно
    }
    // --------------------------------------------------

    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    // Этот объект будет хранить состояние клавиш { "key": boolean }
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true; // Приводим к нижнему регистру для удобства
    }));

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));
    // ---------------------------------------------

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА ---
    var playerSpeed = 0.05; // Скорость может понадобиться другая для модели
    var gravity = -0.008; // Гравитация тоже может потребовать подстройки
    var playerVerticalVelocity = 0;
    var jumpStrength = 0.15; // Сила прыжка
    var isGrounded = true;
    var groundCheckOffset = 0.1; // Небольшое смещение для проверки земли, чтобы не триггерить лишний раз
    var maxJumps = 2;
    var jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.18; // Сила второго прыжка
    var sprintMultiplier = 2;
    var rotationSpeed = 0.1; // Скорость поворота персонажа
    // ----------------------------------------

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        {
            trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            parameter: " " // Пробел
        },
        function () {
            if (jumpsAvailable > 0) {
                if (jumpsAvailable === 1) { // Второй прыжок
                    playerVerticalVelocity = secondJumpStrength;
                } else { // Первый прыжок
                    playerVerticalVelocity = jumpStrength;
                }
                jumpsAvailable--; // Тратим прыжок
                isGrounded = false;
                // Опционально: запустить анимацию прыжка
                // if (jumpAnim) {
                //     // Возможно, нужно остановить текущую и запустить прыжок один раз
                //     currentAnim?.stop();
                //     jumpAnim.start(false, 1.0, jumpAnim.from, jumpAnim.to, false); // Не зацикливать
                //     currentAnim = jumpAnim; // Спорно, т.к. после прыжка нужна анимация падения/Idle
                // }
            }
        }
    ));
    // -------------------------------------------

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР (Физика, Движение, Анимация, Поворот) ---
    scene.onBeforeRenderObservable.add(() => {
        // Простая физика и проверка земли
        playerVerticalVelocity += gravity;
        player.position.y += playerVerticalVelocity;

        // Проверка земли (подстройте player.position.y < groundCheckOffset)
        if (player.position.y < groundCheckOffset) {
            player.position.y = 0; // Ставим точно на землю (если земля на Y=0)
            playerVerticalVelocity = 0;
            if (!isGrounded) { // Только что приземлились
                jumpsAvailable = maxJumps;
            }
            isGrounded = true;
        } else {
            isGrounded = false;
        }

        // Горизонтальное движение
        let moveDirection = BABYLON.Vector3.Zero(); // Направление движения за этот кадр
        let currentSpeed = playerSpeed;
        let isMoving = false;
        let isRunning = false;

        if (inputMap["shift"]) {
            currentSpeed *= sprintMultiplier;
            isRunning = true;
        }

        if (inputMap["arrowup"] || inputMap["w"]) {
            moveDirection.z = 1;
            isMoving = true;
        }
        if (inputMap["arrowdown"] || inputMap["s"]) {
            moveDirection.z = -1;
            isMoving = true;
        }
        if (inputMap["arrowleft"] || inputMap["a"]) {
            moveDirection.x = -1;
            isMoving = true;
        }
        if (inputMap["arrowright"] || inputMap["d"]) {
            moveDirection.x = 1;
            isMoving = true;
        }

        // Нормализуем вектор направления, чтобы движение по диагонали не было быстрее
        // и применяем скорость
        if (isMoving) {
             // Важно: Учитываем поворот камеры! Иначе управление будет абсолютным (W всегда вперед по Z)
            // Получаем вектор направления камеры "вперед" (без учета вертикального наклона)
            let forward = camera.getDirection(BABYLON.Vector3.Forward());
            forward.y = 0; // Игнорируем наклон камеры вверх/вниз
            forward.normalize();

            // Получаем вектор направления камеры "вправо"
            let right = camera.getDirection(BABYLON.Vector3.Right());
            right.y = 0;
            right.normalize();

            // Комбинируем направление движения с направлением камеры
            let desiredMoveDirection = forward.scale(moveDirection.z).add(right.scale(moveDirection.x));
            desiredMoveDirection.normalize().scaleInPlace(currentSpeed); // Нормализуем и применяем скорость

            // Применяем движение
            player.position.addInPlace(desiredMoveDirection);

             // --- Поворот персонажа ---
            // Поворачиваем персонажа в сторону движения плавно
            if (desiredMoveDirection.lengthSquared() > 0.001) { // Если есть движение
                // Вычисляем целевой угол поворота
                let targetAngle = Math.atan2(desiredMoveDirection.x, desiredMoveDirection.z);
                 // Плавно интерполируем текущий угол к целевому
                // Используем Quaternion для более стабильного вращения
                 let targetRotation = BABYLON.Quaternion.FromEulerAngles(0, targetAngle, 0);
                 if (!player.rotationQuaternion) {
                     player.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(player.rotation.x, player.rotation.y, player.rotation.z);
                 }
                 player.rotationQuaternion = BABYLON.Quaternion.Slerp(player.rotationQuaternion, targetRotation, rotationSpeed);
            }
        }

        // --- Управление анимациями ---
        let desiredAnim = idleAnim; // По умолчанию - стоим

        if (!isGrounded) {
            // В воздухе - нужна анимация прыжка/падения
            // Пока оставим Idle или можно назначить jumpAnim, если он подходит для падения
             desiredAnim = jumpAnim ? jumpAnim : idleAnim; // Или специальная анимация падения FallAnim
        } else if (isMoving) {
            desiredAnim = isRunning ? runAnim : walkAnim; // Бег или ходьба
        } else {
            desiredAnim = idleAnim; // Стоим на земле
        }

        // Меняем анимацию, только если она действительно должна измениться
        if (currentAnim !== desiredAnim && desiredAnim) {
            currentAnim?.stop(); // Останавливаем предыдущую
            // Запускаем новую зацикленно (true). Для прыжка может быть false.
            desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
            currentAnim = desiredAnim;
        }
    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ КАЖДЫЙ КАДР ---

    // Возвращаем корневой меш игрока
    return player;
}

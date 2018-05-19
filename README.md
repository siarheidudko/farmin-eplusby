﻿### Интерфейс для выгрузки всей базы данных карт евроопта в файл

запуск "start.bat" или "node.exe stream.js"

в e-plus.conf можно указать 
"token":"*********************", - токен
"link":"https://e-plus.by/api/1.0/discountclub.cards", - ссылка из доков на API
"limit":"10000", - количество записей в запросе (можно изменить на от 1 до 10к), запрос раз в 5 сек чтобы не DoSить API
"offset":"0", - сдвиг (если чисто на потестить можно поменять, для загрузки полных данных должен быть равен 0)
"path":"./temp/eplusDiscount.txt" - файл для выгрузки (с указанием пути)

в e-plus.log пишется лог работы скрипта

При ошибке записи в файл для выгрузки - выдаст текст ошибки в консоль, удалит файл выгрузки, грохнет процесс ноды.
При ошибке записи в лог - выдаст в консоль что логгирование не ведется и продолжит работу.
При 5 плохих запросах подряд выдаст в консоль "Ошибка работы API, обработано записей:" и грохнет процесс ноды. Файл выгрузки не удаляется. Подробности ошибки(код ответа сервера) можно глянуть в логе e-plus.log.

Таймаут запроса 30 сек. Запросы будут идти пока возвращаемый массив имеет элементы или до 5 ошибок.
/*---------------------------------------------------------------------------
 * @Module Name: Forum
 * @Description: Forum for LiveStreet
 * @Version: 1.0
 * @Author: Chiffa
 * @LiveStreet version: 1.X
 * @File Name: forum.js
 * @License: CC BY-NC, http://creativecommons.org/licenses/by-nc/3.0/
 *----------------------------------------------------------------------------
 */

var ls = ls || {};

/**
 * Main
 * last update: 8.13
 */
ls.forum = (function ($) {

    /**
     * Открывает\закрывает форму быстрого ответа
     */
    this.fastReply = function (el) {
        var form = $('#fast-reply-form');
        if (form.is(":visible")) {
            form.slideUp();
            $(el).removeClass('button-primary');
        } else {
            form.slideDown();
            $(el).addClass('button-primary');
        }
        return false;
    };

    this.cancelPost = function () {
        ls.forum.configReplyForm(0, 0);
        $('#post_text').val('');
    };

    this.configReplyForm = function (idPost, bScroll) {
        bScroll = bScroll || true;
        var $form = $('#fast-reply-form');
        if ($form.length) {
            if ($form.is(":hidden")) {
                $form.slideDown();
            }
            var replyto = $form.find('#replyto');
            replyto.val(idPost);
            var rtpw = $('#reply-to-post-wrap');
            if (replyto.val() > 0) {
                var postLink = aRouter['forum'] + "findpost/" + idPost + "/";
                rtpw.show().find('span').html('<a class="link-dashed" href="' + postLink + '" target="_blank">#' + idPost + '</a>');
            } else {
                rtpw.hide().find('span').html('');
            }
            if (bScroll) $.scrollTo($form, 1000, {offset: -220});
        }
        return $form;
    };

    /**
     * Окно подтверждения действия
     */
    this.configConfirmBox = function (text, params, callback) {
        var $window = $('#confirm-box');
        var $text = $window.find('.confirm-box-text'),
            $btn = $window.find('.js-confirm-yes');
        $text.text(text || '');
        $window.removeData('params');
        $window.data('params', params);
        if ($.type(callback) == 'function')
            $btn.click($.proxy(callback, $window));
        else
            $btn.unbind('click');
        return $window;
    };

    /**
     * Ответ на сообщение
     */
    this.replyPost = function () {
        var idPost = $(this).attr('data-post-id');
        var userName = $(this).attr('data-name');
        ls.forum.configReplyForm(idPost);
        if (userName) $.markItUp({target: $('#post_text'), replaceWith: '@' + userName + ', '});
        return false;
    };

    /**
     * Цитирование сообщения
     */
    this.quotePost = function () {
        var idPost = $(this).attr('data-post-id');
        ls.forum.configReplyForm(idPost);
        var $post = $(this).parents('#post-' + idPost);
        var $text = $post.find('.forum-post-body .js-post-text-source').html();
        $.markItUp({
            target: $('#post_text'),
            replaceWith: '<blockquote reply="' + idPost + '">' + $.trim($text) + '</blockquote>'
        });
        return false;
    };

    /**
     * Удаление сообщения
     */
    this.deletePost = function () {
        var idPost = $(this).attr('data-post-id');
        var $window = ls.forum.configConfirmBox(ls.lang.get('plugin.forum.post_delete_confirm'), {'id': idPost}, function (e) {
            var sId = $(this).data('params').id;
            window.location = aRouter.forum + 'topic/delete/' + sId;
        });
        $window.jqmShow();
        return false;
    };

    /**
     * Модальное окно с прямой ссылкой на сообщение
     */
    this.linkToPost = function (idPost) {
        var $window = $('#link-to-post');
        $window.find('#link-to-post-input').val(aRouter['forum'] + "findpost/" + idPost + "/").select();
        $window.jqmShow();
        return false;
    };

    /**
     * Меню быстрой навигации
     */
    this.jumpMenu = function (list) {
        list = $(list);
        if (list.val() > 0) {
            list.parent('form').submit();
            return;
        }
        return false;
    };

    /**
     * Колбэк заблокированной кнопки (для гостей)
     */
    this.disabledButton = function () {
        if (ls.blocks.switchTab('login', 'popup-login')) {
            $('#window_login_form').jqmShow();
        } else {
            window.location = aRouter.login;
        }
        return false;
    };

    /**
     * Предпросмотр текста
     */
    this.preview = function (form, preview) {
        form = $('#' + form);
        preview = $('#' + preview);
        var url = aRouter['forum'] + 'ajax/preview/';
        ls.hook.marker('previewBefore');
        ls.ajaxSubmit(url, form, function (result) {
            if (result.bStateError) {
                ls.msg.error(null, result.sMsg);
            } else {
                preview.show().html(result.sText);
                ls.hook.run('ls_forum_preview_after', [form, preview, result]);
                ls.forum.initSpoilers();
                ls.forum.initQuotes();
            }
        });
        return false;
    };

    /**
     * Свернуть\развернуть категорию
     */
    this.toggleCat = function (e) {
        var $section = $(this).parent().parent('.toggle-section');
        var $content = $section.children('.forums-content'),
            $note = $section.children('.forums-note');
        if ($content.is(":visible")) {
            $section.addClass('collapsed');
            $content.slideUp();
            if ($note) $note.slideDown();
        } else {
            $section.removeClass('collapsed');
            $content.slideDown();
            if ($note) $note.slideUp();
        }
        if (e) e.preventDefault();
    };

    /**
     * Инициализация переключателей
     */
    this.initToggler = function () {
        $('.js-forum-cat-toggler').click(this.toggleCat);

    };
    /**
     * Инициализация кнопок
     */
    this.initButtons = function () {
        $('.js-post-reply').click(this.replyPost);
        $('.js-post-quote').click(this.quotePost);
        $('.js-post-delete').click(this.deletePost);
    };
    /**
     * Инициализация спойлера
     */
    this.initSpoilers = function () {
        $('.spoiler-body').each(function () {
            var $body = $(this);
            if (!$body.data('init')) {
                var title = $body.data('name') || ls.lang.get('panel_spoiler_placeholder');
                var $head = $('<div class="spoiler-head folded">' + title + '</div>');
                $head.insertBefore($body).click(function () {
                    if ($body.is(":visible")) {
                        $(this).addClass('folded').removeClass('unfolded');
                        $body.slideUp('fast');
                    } else {
                        $(this).removeClass('folded').addClass('unfolded');
                        $body.slideDown('fast');
                    }
                });
                var $fold = $('<div class="spoiler-fold"></div>').click(function () {
                    $.scrollTo($head, {duration: 200, axis: 'y', offset: -200});
                    $head.click().animate({opacity: 0.3}, 500).animate({opacity: 1}, 700);
                });
                $body.append($fold);
                $body.data('init', true);
            }
        });
    };
    /**
     * Инициализация цитат
     */
    this.initQuotes = function () {
        var self = this;
        $('.forum-quote').each(function () {
            var item = $(this);
            if (!item.data('init')) {
                var head = $('<div class="quote-head">'
                    + ( item.data('user_url') ? '<a href="' + item.data('user_url') + '" class="ls-user">' + item.data('user_login') + '</a>' : item.data('user_login') )
                    + '<a href="' + item.data('post_url') + '"><i class="icon-share-alt"></i>' + item.data('post_date') + '</a>'
                    + '</div>');
                item.prepend(head);
                item.data('init', true);
            }
        });
    };
    /**
     * Инициализация модальных окон
     */
    this.initModals = function () {
        $('#link-to-post').jqm();
        $('#confirm-box').jqm();
        $('#insert-spoiler').jqm();
    };
    /**
     * Инициализация всплывающих подсказок
     */
    this.initHints = function () {
        $('.js-infobox-vote-forum_post').poshytip({
            content: function () {
                var id = $(this).data('vote-id');
                return $('#vote-info-forum_post-' + id).html();
            },
            className: 'infobox-standart',
            alignTo: 'target',
            alignX: 'center',
            alignY: 'top',
            offsetX: 2,
            liveEvents: true,
            showTimeout: 100
        });
        $('.js-tiptop-help').poshytip({
            className: 'infobox-forum',
            alignY: 'top',
            followCursor: true,
            showTimeout: 100
        });
    };
    /**
     * Инициализация селекторов
     */
    this.initSelect = function () {
        $.each($('.js-forum-select'), function (k, v) {
            $(v).find('.js-select-forum').bind('change', function (e) {
                this.loadTopics($(e.target));
            }.bind(this));
        }.bind(this));
    };

    /**
     * Подгружаем список топиков из выбранного форума в селектор
     */
    this.loadTopics = function ($forum) {
        $topic = $forum.parents('.js-forum-select').find('.js-select-topic');
        $topic.empty();
        $topic.append('<option value="">' + ls.lang.get('plugin.forum.select_topic') + '</option>');

        if (!$forum.val()) {
            $topic.hide();
            return;
        }

        ls.ajax(aRouter['forum'] + 'ajax/gettopics/', {forum_id: $forum.val()}, function (result) {
            if (result.bStateError) {
                ls.msg.error(null, result.sMsg);
            } else {
                $.each(result.aTopics, function (k, v) {
                    $topic.append('<option value="' + v.id + '">' + v.title + '</option>');
                });
                $topic.show();
            }
        });
    };

    /**
     * Показывает форму вставки спойлера
     * Callback for markitup
     */
    this.showSpoilerForm = function () {
        var $modal = $('#insert-spoiler');
        $modal.find('#spoiler-title').val('');
        $modal.find('#spoiler-text').val('');
        $modal.jqmShow();
    };
    /**
     * Вставляет спойлер в текст
     * Callback for markitup
     */
    this.insertSpoiler = function (form, target) {
        form = $('#' + form);
        $title = form.find('#spoiler-title').val();
        $text = form.find('#spoiler-text').val();
        $.markItUp({
            target: $('#' + target),
            replaceWith: '<spoiler name="' + $title + '">' + $.trim($text) + '</spoiler>'
        });
        $('#insert-spoiler').jqmHide();
        return false;
    };

    /**
     * Настройки редактора
     * type: mini
     */
    this.getMarkitupMini = function () {
        return {
            onShiftEnter: {keepDefault: false, replaceWith: '<br />\n'},
            onCtrlEnter: {keepDefault: false, openWith: '\n<p>', closeWith: '</p>'},
            onTab: {keepDefault: false, replaceWith: '    '},
            markupSet: [
                {
                    name: ls.lang.get('panel_b'),
                    className: 'editor-bold',
                    key: 'B',
                    openWith: '(!(<strong>|!|<b>)!)',
                    closeWith: '(!(</strong>|!|</b>)!)'
                },
                {
                    name: ls.lang.get('panel_i'),
                    className: 'editor-italic',
                    key: 'I',
                    openWith: '(!(<em>|!|<i>)!)',
                    closeWith: '(!(</em>|!|</i>)!)'
                },
                {
                    name: ls.lang.get('panel_s'),
                    className: 'editor-stroke',
                    key: 'S',
                    openWith: '<s>',
                    closeWith: '</s>'
                },
                {
                    name: ls.lang.get('panel_quote'), className: 'editor-quote', key: 'Q', replaceWith: function (m) {
                    if (m.selectionOuter) return '<blockquote>' + m.selectionOuter + '</blockquote>'; else if (m.selection) return '<blockquote>' + m.selection + '</blockquote>'; else return '<blockquote></blockquote>'
                }
                },
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_image'),
                    className: 'editor-picture',
                    key: 'P',
                    beforeInsert: function (h) {
                        jQuery('#window_upload_img').jqmShow();
                    }
                },
                {
                    name: ls.lang.get('panel_url'),
                    className: 'editor-link',
                    key: 'L',
                    openWith: '<a href="[![' + ls.lang.get('panel_url_promt') + ':!:http://]!]"(!( title="[![Title]!]")!)>',
                    closeWith: '</a>',
                    placeHolder: 'Your text to link...'
                },
                {
                    name: ls.lang.get('panel_user'),
                    className: 'editor-user',
                    replaceWith: '<ls user="[![' + ls.lang.get('panel_user_promt') + ']!]" />'
                },
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_clear_tags'), className: 'editor-clean', replaceWith: function (markitup) {
                    return markitup.selection.replace(/<(.*?)>/g, "")
                }
                }
            ]
        }
    };
    /**
     * Настройки редактора
     * type: full
     */
    this.getMarkitup = function () {
        return {
            onShiftEnter: {keepDefault: false, replaceWith: '<br />\n'},
            onCtrlEnter: {keepDefault: false, openWith: '\n<p>', closeWith: '</p>'},
            onTab: {keepDefault: false, replaceWith: '    '},
            markupSet: [
                {name: 'H4', className: 'editor-h4', openWith: '<h4>', closeWith: '</h4>'},
                {name: 'H5', className: 'editor-h5', openWith: '<h5>', closeWith: '</h5>'},
                {name: 'H6', className: 'editor-h6', openWith: '<h6>', closeWith: '</h6>'},
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_b'),
                    className: 'editor-bold',
                    key: 'B',
                    openWith: '(!(<strong>|!|<b>)!)',
                    closeWith: '(!(</strong>|!|</b>)!)'
                },
                {
                    name: ls.lang.get('panel_i'),
                    className: 'editor-italic',
                    key: 'I',
                    openWith: '(!(<em>|!|<i>)!)',
                    closeWith: '(!(</em>|!|</i>)!)'
                },
                {
                    name: ls.lang.get('panel_s'),
                    className: 'editor-stroke',
                    key: 'S',
                    openWith: '<s>',
                    closeWith: '</s>'
                },
                {
                    name: ls.lang.get('panel_u'),
                    className: 'editor-underline',
                    key: 'U',
                    openWith: '<u>',
                    closeWith: '</u>'
                },
                {
                    name: ls.lang.get('panel_quote'), className: 'editor-quote', key: 'Q', replaceWith: function (m) {
                    if (m.selectionOuter) return '<blockquote>' + m.selectionOuter + '</blockquote>'; else if (m.selection) return '<blockquote>' + m.selection + '</blockquote>'; else return '<blockquote></blockquote>'
                }
                },
                {name: ls.lang.get('panel_code'), className: 'editor-code', openWith: '<code>', closeWith: '</code>'},
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_list'),
                    className: 'editor-ul',
                    openWith: '    <li>',
                    closeWith: '</li>',
                    multiline: true,
                    openBlockWith: '<ul>\n',
                    closeBlockWith: '\n</ul>'
                },
                {
                    name: ls.lang.get('panel_list'),
                    className: 'editor-ol',
                    openWith: '    <li>',
                    closeWith: '</li>',
                    multiline: true,
                    openBlockWith: '<ol>\n',
                    closeBlockWith: '\n</ol>'
                },
                {name: ls.lang.get('panel_list_li'), className: 'editor-li', openWith: '<li>', closeWith: '</li>'},
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_image'),
                    className: 'editor-picture',
                    key: 'P',
                    beforeInsert: function (h) {
                        jQuery('#window_upload_img').jqmShow();
                    }
                },
                {
                    name: ls.lang.get('panel_video'),
                    className: 'editor-video',
                    replaceWith: '<video>[![' + ls.lang.get('panel_video_promt') + ':!:http://]!]</video>'
                },
                {
                    name: ls.lang.get('panel_url'),
                    className: 'editor-link',
                    key: 'L',
                    openWith: '<a href="[![' + ls.lang.get('panel_url_promt') + ':!:http://]!]"(!( title="[![Title]!]")!)>',
                    closeWith: '</a>',
                    placeHolder: 'Your text to link...'
                },
                {
                    name: ls.lang.get('panel_user'),
                    className: 'editor-user',
                    replaceWith: '<ls user="[![' + ls.lang.get('panel_user_promt') + ']!]" />'
                },
                {
                    name: ls.lang.get('panel_spoiler'), className: 'editor-spoiler', beforeInsert: function (h) {
                    ls.forum.showSpoilerForm();
                }
                },
                {separator: '---------------'},
                {
                    name: ls.lang.get('panel_clear_tags'), className: 'editor-clean', replaceWith: function (markitup) {
                    return markitup.selection.replace(/<(.*?)>/g, "")
                }
                }
            ]
        }
    };

    return this;
}).call(ls.forum || {}, jQuery);


/**
 * Attach
 * last update: 12.15
 */
ls.forum.attach = (function ($) {
    this.swfu;
    /**
     * Инициализация компонента
     */
    this.init = function () {
        var self = this;

        //	$('#js-attach-upload-file').on('change', function(e) {
        //		self.upload();
        //	});
        $('.js-attach-file-download').click(function (e) {
            self.download($(this).data('file-id'));
            return false;
        });

        $('#js-attach-my-files').click(function () {
            self.showMyFiles();
            return false;
        });
        $('.attach-files-item').click(function () {
            self.hideMyFiles();
            self.attach($(this).data('id'));
            return false;
        });
        self.initModals();
    };

    /**
     * Инициализация модальных окон
     */
    this.initModals = function () {
        $('#modal-attach-files').jqm();
        $('#forum-attach-upload-form').jqm({trigger: '#forum-attach-upload'});
    };
    this.showMyFiles = function () {
        $('#modal-attach-files').jqmShow();
    };
    this.hideMyFiles = function () {
        $('#modal-attach-files').jqmHide();
    };

    /**
     * Инициализация flash загрузчика
     */
    this.initSwfUpload = function (opt) {
        opt = opt || {};
        opt.button_placeholder_id = 'forum-attach-upload';
        opt.post_params.ls_fattach_target_tmp = $.cookie('ls_fattach_target_tmp') ? $.cookie('ls_fattach_target_tmp') : 0;
        opt.upload_url = aRouter.forum + 'ajax/attach/upload/';
        opt.file_types_description = 'attach';
        opt.button_text = '<a href="#" class="link-dotted">' + ls.lang.get('plugin.forum.attach_upload_file_choose') + '</a>';

        $(ls.swfupload).unbind('load').bind('load', function () {
            this.swfu = ls.swfupload.init(opt);

            $(this.swfu).bind('eUploadProgress', this.swfHandlerUploadProgress);
            $(this.swfu).bind('eFileDialogComplete', this.swfHandlerFileDialogComplete);
            $(this.swfu).bind('eUploadSuccess', this.swfHandlerUploadSuccess);
            $(this.swfu).bind('eUploadComplete', this.swfHandlerUploadComplete);
        }.bind(this));

        ls.swfupload.loadSwf();
    };

    this.swfHandlerUploadProgress = function (e, file, bytesLoaded, percent) {
        $('#attach_file_empty_filename').text(file.name);
        var progressEmpty = $('#attach_file_empty_progress');
        progressEmpty.find('.js-upload-label').text(percent >= 100 ? 'Complete..' : percent + '%');
        progressEmpty.find('.js-upload-percents').css({'width': percent + '%'});
    };

    this.swfHandlerFileDialogComplete = function (e, numFilesSelected, numFilesQueued) {
        if (numFilesQueued > 0) {
            ls.forum.attach.addFileEmpty();
        }
    };

    this.swfHandlerUploadSuccess = function (e, file, serverData) {
        ls.forum.attach.addFile(jQuery.parseJSON(serverData));
    };

    this.swfHandlerUploadComplete = function (e, file, next) {
        if (next > 0) {
            ls.forum.attach.addFileEmpty();
        }
    };

    /**
     * Добавляет пустую форму файла
     */
    this.addFileEmpty = function () {
        $('#attach_file_empty').remove();
        var $template = $('<li id="attach_file_empty" class="attach-upload-progress">'
            + '<div id="attach_file_empty_filename" class="attach-upload-progress-filename"></div>'
            + '<div id="attach_file_empty_progress" class="progress-bar">'
            + '<div class="progress-bar-value js-upload-percents"></div>'
            + '<div class="progress-bar-label js-upload-label">Uploading...</div>'
            + '</div></li>');
        $('#swfu_files').append($template);
    };

    /**
     * Добавляет форму с загруженным файлом
     */
    this.addFile = function (data) {
        $('#attach_file_empty').remove();
        if (!data.bStateError) {
            var $template = $('<li id="file_' + data.id + '" class="forum-attach-files-item"><div class="forum-attach-files-item-header">'
                + '<span class="forum-attach-files-item-title">' + data.name + '</span><span class="forum-attach-files-item-size">' + data.size + '</span></div>'
                + '<textarea onBlur="ls.forum.attach.setFileDescription(' + data.id + ', this.value)">' + data.text + '</textarea><br />'
                + '<a href="javascript:ls.forum.attach.deleteFile(' + data.id + ')" class="file-delete">' + ls.lang.get('plugin.forum.attach_file_delete') + '</a>'
                + '</li>');
            $('#swfu_files').append($template);
            ls.msg.notice(data.sMsgTitle, data.sMsg);
        } else {
            ls.msg.error(data.sMsgTitle, data.sMsg);
        }
        ls.forum.attach.closeForm();
    };

    /**
     * Удалить файл
     */
    this.deleteFile = function (idFile) {
        var $window = ls.forum.configConfirmBox(ls.lang.get('plugin.forum.attach_file_delete_confirm'), {'id': idFile}, function (e) {
            var sFileId = $(this).data('params').id;
            // id поста возьмем из формы
            var sPostId = $('#forum-attach-post-id').val();
            ls.ajax(aRouter['forum'] + 'ajax/attach/delete', {'id': sFileId, 'post': sPostId}, function (data) {
                if (!data.bStateError) {
                    $('#file_' + sFileId).remove();
                    ls.msg.notice(data.sMsgTitle, data.sMsg);
                } else {
                    ls.msg.error(data.sMsgTitle, data.sMsg);
                }
                $window.jqmHide();
            });
        });
        $window.jqmShow();
    };

    /**
     * Установка описания для файла
     */
    this.setFileDescription = function (id, text) {
        // id поста возьмем из формы
        var sPostId = $('#forum-attach-post-id').val();
        ls.ajax(aRouter.forum + 'ajax/attach/text', {'id': id, 'post': sPostId, 'text': text}, function (result) {
            if (!result.bStateError) {

            } else {
                ls.msg.error('Error', 'Please try again later');
            }
        });
    };

    /**
     * Прикрепление файла к сообщению
     */
    this.attach = function (id) {
        ls.forum.attach.addFileEmpty();

        var attachPostId = $('#forum-attach-post-id');
        if (!attachPostId.length) {
            return false;
        }

        var post_id = attachPostId.val();

        var params = { id: id, post_id: post_id }

        ls.ajax(aRouter.forum + 'ajax/attach/file/', params, function (data) {
            if (data.bStateError) {
                $('#attach_file_empty').remove();
                ls.msg.error(data.sMsgTitle, data.sMsg);
            } else {
                ls.forum.attach.addFile(data);
            }
        });
    };

    /**
     * Загрузка файла на сервер
     */
    this.upload = function () {
        ls.forum.attach.closeForm();
        ls.forum.attach.addFileEmpty();
        ls.ajaxSubmit(aRouter.forum + 'ajax/attach/upload/', $('#forum-attach-upload-form'), function (data) {
            if (data.bStateError) {
                ls.msg.error(data.sMsgTitle, data.sMsg);
            } else {
                ls.forum.attach.addFile(data);
            }
            $('#attach_file_empty').remove();
        });
    };

    this.closeForm = function () {
        $('#forum-attach-upload-form').jqmHide();
        return false;
    };
    this.showForm = function () {
        $('#forum-attach-upload-form').jqmShow();
        return false;
    };

    /**
     * Загрузка файла с сервера
     */
    this.download = function (id) {
        window.location = aRouter.forum + 'download/' + id;
    };

    return this;
}).call(ls.forum.attach || {}, jQuery);


/**
 * Функционал тул-бара
 * last update: 5.13
 */
ls.forum.toolbar = (function ($) {
    this.iCurrentPost = -1;
    /**
     * Инициализация компонента
     */
    this.init = function () {
        var vars = [], hash;
        var hashes = window.location.hash.replace('#', '').split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('-');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

        if (vars.go !== undefined) {
            if (vars.go == 'last') {
                this.iCurrentPost = $('.js-post').length - 2;
            } else {
                this.iCurrentPost = parseInt(vars.go) - 1;
            }
            this.goNextPost();
        }
    };
    /**
     * Дефолтные настройки
     */
    this.reset = function () {
        this.iCurrentPost = -1;
    };
    /**
     * Переключение на следующее сообщение
     */
    this.goNextPost = function () {
        this.iCurrentPost++;
        var post = $('.js-post:eq(' + this.iCurrentPost + ')');
        if (post.length) {
            $.scrollTo(post, 500);
        } else {
            this.iCurrentPost = $('.js-post').length - 1;
            var page = $('.js-paging-next-page');
            if (page.length && page.attr('href')) {
                window.location = page.attr('href') + '#go-0';
            }
        }
        return false;
    };
    /**
     * Переключение на предыдущее сообщение
     */
    this.goPrevPost = function () {
        this.iCurrentPost--;
        if (this.iCurrentPost < 0) {
            this.iCurrentPost = 0;
            var page = $('.js-paging-prev-page');
            if (page.length && page.attr('href')) {
                window.location = page.attr('href') + '#go-last';
            }
        } else {
            var post = $('.js-post:eq(' + this.iCurrentPost + ')');
            if (post.length) {
                $.scrollTo(post, 500);
            }
        }
        return false;
    };

    return this;
}).call(ls.forum.toolbar || {}, jQuery);


/**
 * Вспомогательные функции
 * last update: 8.13
 */
ls.tools = (function ($) {


    return this;
}).call(ls.tools || {}, jQuery);


/**
 * Инициализация
 * last update: 8.13
 */
jQuery(document).ready(function ($) {
    ls.hook.run('forum_template_init_start', [], window);
    /**
     * Инициализация
     */
    ls.forum.initToggler();
    ls.forum.initButtons();
    ls.forum.initSpoilers();
    ls.forum.initQuotes();
    ls.forum.initModals();
    ls.forum.initHints();
    /**
     * Инициализация компонентов
     */
    ls.forum.attach.init();
    ls.forum.toolbar.init();
    /**
     * Прямой эфир
     */
    ls.blocks.options.type.stream_forum = {
        url: aRouter['forum'] + 'ajax/getlasttopics/'
    };
    /**
     * Голосование
     */
    ls.vote.options.type.forum_post = {
        url: aRouter['forum'] + 'ajax/vote/',
        targetName: 'idPost'
    };
    ls.vote.onVoteForumPost = function (iTargetId, iValue, sType, oVars, result) {
        //будет актуально в девелоперской версии лс
        //	oVars.vote.addClass('js-tooltip-vote-forum').tooltip('enter');
    };

    ls.hook.run('forum_template_init_end', [], window);
});
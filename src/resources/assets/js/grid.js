/*
 * Copyright (c) 2018.
 * @author Antony [leantony] Chacha
 */

var _grids = _grids || {};

(function ($) {

    if (typeof $ === 'undefined') {
        throw new Error("Requires jQuery")
    }

    /**
     * Shared utilities
     *
     * @type object
     * @public
     */
    _grids.utils = {};

    (function ($) {

        "use strict";

        /**
         * Handle an ajax request from a button, form, link, etc
         *
         * @param element
         * @param event
         */
        _grids.utils.handleAjaxRequest = function (element, event) {
            // click or submit
            event = event || 'click';

            // do not do anything if we have nothing to work with
            if (element.length < 1) return;

            // since our refs are data-remote or class with data-remote, we need to loop
            element.each(function (i, obj) {
                obj = $(obj);
                // confirmation
                var confirmation = obj.data('trigger-confirm');
                var confirmationMessage = obj.data('confirmation-msg') || 'Are you sure?';
                // check if we need to refresh any pjax container
                var pjaxContainer = obj.data('pjax-target');
                // check if we need to force a page refresh. will override shouldPjax
                var refresh = obj.data('refresh-page');
                // a form
                var isForm = obj.is('form');
                // prevent or enable blocking of UI
                var blockUi = obj.data('block-ui') || true;
                // custom block UI msg
                var waitingMsg = obj.data('waiting-message');

                obj.on(event, function (e) {
                    e.preventDefault();
                    // check for a confirmation message
                    if (confirmation) {
                        if (!confirm(confirmationMessage)) {
                            return;
                        }
                    }
                    $.ajax({
                        method: isForm ? obj.attr('method') : (obj.data('method') || 'POST'),
                        url: isForm ? obj.attr('action') : obj.attr('href'),
                        data: isForm ? obj.serialize() : null,
                        beforeSend: function () {
                            if (blockUi) {
                                _grids.utils.blockUI(waitingMsg || 'Please wait ...')
                            }
                        },
                        complete: function () {
                            if (blockUi) {
                                _grids.utils.unBlockUI();
                            }
                        },
                        success: function (data) {
                            // reload a pjax container
                            if (pjaxContainer) {
                                $.pjax.reload({container: pjaxContainer});
                            }
                        },
                        error: function (data) {
                            // handle errors gracefully
                            if (typeof toastr !== 'undefined') {
                                toastr.error("An error occurred", "Whoops!");
                            }
                            alert("An error occurred");
                        }
                    });
                });
            });
        };

        /**
         * Block UI. call this at the start of an ajax request
         * @param message
         */
        _grids.utils.blockUI = function (message) {
            if (typeof message === 'undefined') {
                message = 'Please wait ...';
            }
            var content = '<span id="bui">' + message + '</span>';
            $.blockUI({
                message: content,
                css: {
                    'border': 'none',
                    'padding': '15px',
                    'backgroundColor': '#333C44',
                    '-webkit-border-radius': '3px',
                    '-moz-border-radius': '3px',
                    'opacity': 1,
                    'color': '#fff'
                },
                overlayCSS: {
                    'backgroundColor': '#000',
                    'opacity': 0.4,
                    'cursor': 'wait',
                    'z-index': 1030
                }
            });
        };

        /**
         * Unblock UI
         */
        _grids.utils.unBlockUI = function () {
            $.unblockUI();
        };

        /**
         * Linkable rows on tables (rows that can be clicked to navigate to a location)
         */
        _grids.utils.tableLinks = function (options) {
            if (!options) {
                console.warn('No options defined.');
                return;
            }
            var elements = $(options.element);
            elements.each(function (i, obj) {
                var el = $(obj);
                var link = el.data('url');
                el.css({'cursor': "pointer"});
                el.click(function (e) {
                    setTimeout(function () {
                        window.location = link;
                    }, options.navigationDelay || 100);
                });
            });
        };

    })(jQuery);

    /**
     * The global grid object
     *
     * @type object
     * @public
     */
    _grids.grid = {};

    (function ($) {

        "use strict";

        /**
         * Initialization
         *
         * @param opts
         */
        var grid = function (opts) {

            var defaults = {
                /**
                 * The ID of the html element containing the grid
                 */
                id: '#some-grid',
                /**
                 * The ID of the html element containing the filter form
                 */
                filterForm: undefined,
                /**
                 * The ID of the html element containing the search form
                 */
                searchForm: undefined,
                /**
                 * The CSS class of the columns that are sortable
                 */
                sortLinks: 'data-sort',
                /**
                 * The selector of a date range filter
                 */
                dateRangeSelector: '.date-range',
                /**
                 * PJAX
                 */
                pjax: {
                    /**
                     * Any extra pjax plugin options
                     */
                    pjaxOptions: {},

                    /**
                     * Something to do once the PJAX request has been finished
                     */
                    afterPjax: function (e) {
                    }
                }
            };
            this.opts = $.extend({}, defaults, opts || {});
        };

        /**
         * Enable pjax
         *
         * @param container the root element for which html contents shall be replaced
         * @param target the element in the root element that will trigger the pjax request
         * @param afterPjax a function that will be executed after the pjax request is done
         * @param options
         */
        grid.prototype.setupPjax = function (container, target, afterPjax, options) {
            // global timeout
            var $this = this;
            $.pjax.defaults.timeout = options.timeout || 3000;
            $(document).pjax(target, container, options);
            $(document).on('ready pjax:end', function (event) {
                afterPjax($(event.target));
                // internal calls
                setupDateRangePicker($this);
            })
        };

        /**
         * Setup date range picker
         *
         * @param $this
         */
        function setupDateRangePicker($this) {
            if ($this.opts.dateRangeSelector) {
                if (typeof daterangepicker !== 'function') {
                    console.warn('date range picker option requires https://github.com/dangrossman/bootstrap-daterangepicker.git')
                } else {
                    var start = moment().subtract(29, 'days');
                    var end = moment();

                    $($this.opts.dateRangeSelector).daterangepicker({
                        startDate: start,
                        endDate: end,
                        ranges: {
                            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                        },
                        autoApply: true,
                        locale: {
                            format: "YYYY-MM-DD",
                            cancelLabel: 'Clear'
                        }
                    });
                }
            }
        }

        /**
         * Initialize pjax functionality
         */
        grid.prototype.bindPjax = function () {
            var $this = this;
            this.setupPjax(
                $this.opts.id,
                'a[data-trigger-pjax=1]',
                $this.opts.pjax.afterPjax,
                $this.opts.pjax.pjaxOptions
            );

            setupDateRangePicker($this);
        };

        /**
         * Pjax per row filter
         */
        grid.prototype.filter = function () {
            var $this = this;
            var form = $($this.opts.filterForm);

            if (form.length > 0) {
                $(document).on('submit', $this.opts.filterForm, function (event) {
                    $.pjax.submit(event, $this.opts.id, $this.opts.pjax.pjaxOptions)
                });
            }
        };

        /**
         * Pjax search
         */
        grid.prototype.search = function () {
            var $this = this;
            var form = $($this.opts.searchForm);

            if (form.length > 0) {
                $(document).on('submit', $this.opts.searchForm, function (event) {
                    $.pjax.submit(event, $this.opts.id, $this.opts.pjax.pjaxOptions)
                });
            }
        };

        _grids.grid.init = function (options) {
            var obj = new grid(options);
            obj.bindPjax();
            obj.search();
            obj.filter();
        };
    })(jQuery);

    _grids.formUtils = {
        /**
         * Return html that can be used to render a bootstrap alert on the form
         *
         * @param type
         * @param response
         * @returns {string}
         */
        renderAlert: function (type, response) {
            var validTypes = ['success', 'error', 'notice'], html = '';
            if (typeof type === 'undefined' || ($.inArray(type, validTypes) < 0)) {
                type = validTypes[0];
            }
            if (type === 'success') {
                html += '<div class="alert alert-success">';
            }
            else if (type === 'error') {
                html += '<div class="alert alert-danger">';
            } else {
                html += '<div class="alert alert-warning">';
            }
            html += '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>';
            // add a heading
            if (type === 'error') {
                html += response.message || 'Please fix the following errors';
                html = "<strong>" + html + "</strong>";
                var errs = this.getValidationErrors(response.errors || {});
                return html + errs + '</div>';
            } else {
                return html + response + '</div>'
            }
        },

        /**
         * process validation errors from json to html
         * @param response
         * @returns {string}
         */
        getValidationErrors: function (response) {
            var errorsHtml = '';
            $.each(response, function (key, value) {
                errorsHtml += '<li>' + value + '</li>';
            });
            return errorsHtml;
        },

        /**
         * Form submission from a modal dialog
         *
         * @param formId
         * @param modal
         */
        handleFormSubmission: function (formId, modal) {
            var form = $('#' + formId);
            var submitButton = form.find(':submit');
            var data = form.serialize();
            var action = form.attr('action');
            var method = form.attr('method') || 'POST';
            var originalButtonHtml = $(submitButton).html();
            var pjaxTarget = form.data('pjax-target');
            var notification = form.data('notification-el') || 'modal-notification';
            var $this = this;

            $.ajax({
                type: method,
                url: action,
                data: data,
                dataType: 'json',
                success: function (response) {
                    if (response.success) {
                        var message = '<i class=\"fa fa-check\"></i> ';
                        message += response.message;
                        $('#' + notification).html($this.renderAlert('success', message));
                        // if a redirect is required...
                        if (response.redirectTo) {
                            setTimeout(function () {
                                window.location = response.redirectTo;
                            }, response.redirectTimeout || 500);
                        } else {
                            // hide the modal after 1000 ms
                            setTimeout(function () {
                                modal.modal('hide');
                                if (pjaxTarget) {
                                    // reload a pjax container
                                    $.pjax.reload({container: pjaxTarget})
                                }
                            }, 500);
                        }
                    }
                    else {
                        // display message and hide modal
                        var el = $(notification);
                        el.html($this.renderAlert('error', response.message));
                        setTimeout(function () {
                            modal.modal('hide');
                        }, 500);
                    }
                },
                beforeSend: function () {
                    $(submitButton).attr('disabled', 'disabled').html('<i class="fa fa-spinner fa-spin"></i>&nbsp;loading');
                },
                complete: function () {
                    $(submitButton).html(originalButtonHtml).removeAttr('disabled');
                },
                error: function (data) {
                    var msg;
                    // error handling
                    switch (data.status) {
                        case 500:
                            msg = 'A server error occurred...';
                            break;
                        default:
                            msg = $this.renderAlert('error', data.responseJSON);
                            break;
                    }
                    // display errors
                    var el = $('#' + notification);
                    el.html(msg);
                }
            });
        }
    };

    /**
     * The global modal object
     *
     * @type object
     * @public
     */
    _grids.modal = {};

    (function ($) {
        'use strict';

        var modal = function (options) {
            var defaultOptions = {};
            this.options = $.extend({}, defaultOptions, options || {});
        };

        /**
         * Show a modal dialog dynamically
         */
        modal.prototype.show = function () {
            $('.show_modal_form').on('click', function (e) {
                e.preventDefault();
                var btn = $(this);
                var btnHtml = btn.html();
                var modalDialog = $('#bootstrap_modal');
                // show spinner as soon as user click is triggered
                btn.attr('disabled', 'disabled').html('<i class="fa fa-spinner fa-spin"></i>&nbsp;loading');

                // load the modal into the container put on the html
                $('.modal-content').load($(this).attr("href") || $(this).data('href'), function () {
                    $('#bootstrap_modal').modal({show: true});
                });

                // revert button to original content, once the modal is shown
                modalDialog.on('shown.bs.modal', function (e) {
                    $(btn).html(btnHtml).removeAttr('disabled');
                });

                // destroy the modal
                modalDialog.on('hidden.bs.modal', function (e) {
                    $(this).modal('dispose');
                });
            });
        };

        $('#bootstrap_modal').on("click", '#' + 'modal_form' + ' button[type="submit"]', function (e) {
            e.preventDefault();
            // process forms on the modal
            _grids.formUtils.handleFormSubmission('modal_form', $('#bootstrap_modal'));
        });

        _grids.modal.init = function (options) {
            var obj = new modal(options);
            obj.show();
        };

    }(jQuery));

    /**
     * Initialize stuff
     */
    _grids.init = function () {
        // tooltip
        $('[data-toggle="tooltip"]').tooltip();
        // date picker
        if (typeof daterangepicker !== 'function') {
            console.warn('date picker option requires https://github.com/dangrossman/bootstrap-daterangepicker.git')
        } else {
            $('.grid-datepicker').daterangepicker({
                singleDatePicker: true,
                showDropdowns: true,
                minYear: 1901,
                locale: {
                    format: "YYYY-MM-DD"
                }
            });
        }
        // initialize modal js
        _grids.modal.init({});
        // table links
        _grids.utils.tableLinks({element: '.linkable', navigationDelay: 100});
        // setup ajax listeners
        _grids.utils.handleAjaxRequest($('.data-remote'), 'click');
        _grids.utils.handleAjaxRequest($('form[data-remote]'), 'submit');
    };

    return _grids;
})(jQuery);

_grids.init();

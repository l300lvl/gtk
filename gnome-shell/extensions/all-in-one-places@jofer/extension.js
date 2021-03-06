/**
 * All-in-one Places applet for Cinnamon
 * Version: 1.0
 * 
 * @developer jferrao <jferrao@ymail.com>
 * @url https://github.com/jferrao/gtk/cinnamon/applets 
 * 
 */





/**
 * You can edit this true/false values to costumize the look & feel of the applet.
 * Restart Cinnamon (Alt+F2 + r + Enter) may be needed for changes to take effect.
 */
const SHOW_DESKTOP          = false;
const AUTO_HIDE_TRASH       = false;
const SHOW_BOOKMARKS        = true;
const COLLAPSE_BOOKMARKS    = false;
const SHOW_DEVICES          = true;
const COLLAPSE_DEVICES      = false;
const SHOW_NETWORK          = true;
const COLLAPSE_NETWORK      = false;
const SHOW_RECENT_DOCUMENTS = true;
/**
 * Ok, that's enough editing. ------------------------------------------
 */





/**
 * Import stuff ...
 */
const PanelMenu = imports.ui.panelMenu;

const GLib = imports.gi.GLib;
const Lang = imports.lang;
const St = imports.gi.St;
const ModalDialog = imports.ui.modalDialog;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext;
const _ = Gettext.gettext;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const FileUtils = imports.misc.fileUtils;

const RECENT_ITEMS          = 10;

const ICON_SIZE             = 22;

/**
 * Messages for the confirmation dialog boxes.
 */
const EMPTY_TRASH_LABEL     = _("Empty Trash");
const EMPTY_TRASH_MESSAGE   = _("Are you sure you want to delete all items from the trash?") + "\n" + _("This operation cannot be undone.") + "\n";
const EJECT_DEVICE_LABEL    = _("Eject");
const EJECT_DEVICE_MESSAGE  = _("Are you sure you want to eject this device ?") + "\n";
const CLEAR_RECENT_LABEL    = _("Recent documents");
const CLEAR_RECENT_MESSAGE  = _("Clear the Recent Documents list?") + "\n";




/**
 * Default menu item
 */
function MenuItem()
{
    this._init.apply(this, arguments);
}

MenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(icon, text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
            
        this.label = new St.Label({ text: text });
        this.addActor(this.label);
        this.addActor(icon);
    }
};

/**
 * Device menu item with eject button
 */
function DeviceMenuItem()
{
    this._init.apply(this, arguments);
}

DeviceMenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(device, icon, text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
        
        this.device = device;
        
        this.label = new St.Label({ text: text });
        this.addActor(this.label);
        this.addActor(icon);
        
        let ejectIcon = new St.Icon({ icon_name: 'media-eject', icon_type: St.IconType.SYMBOLIC, style_class: 'popup-menu-icon ' });
        let ejectButton = new St.Button({ child: ejectIcon, tooltip_text: _("Eject") });
        ejectButton.connect('clicked', Lang.bind(this, this._ejectDevice));
        this.addActor(ejectButton);
    },
    
    _ejectDevice: function()
    {
        new ConfirmationDialog(Lang.bind(this, this._doEjectDevice), EJECT_DEVICE_LABEL, EJECT_DEVICE_MESSAGE, _("Cancel"), _("OK")).open();
    },
    
    _doEjectDevice: function()
    {
        this.device.remove();
    },
    
    activate: function(event)
    {
        this.device.launch({ timestamp: event.get_time() });
        PopupMenu.PopupBaseMenuItem.prototype.activate.call(this, event);
    }
};

/**
 * Trash menu item with empty trash button
 */
function TrashMenuItem()
{
    this._init.apply(this, arguments);
}

TrashMenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        this.trash_path = 'trash:///';
        this.trash_file = Gio.file_new_for_uri(this.trash_path);

        this.text = text;

        this._checkTrashStatus();
        this._addTrashWatch();
    },
    
    
    _trashItemBase: function(icon)
    {
        this.label = new St.Label({ text: this.text });
        this.addActor(this.label);
        this.addActor(icon);
    },
    
    _trashItemEmpty: function()
    {
        this.icon = new St.Icon({icon_name: "trashcan_empty", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this._trashItemBase(this.icon);
    },
    
    _trashItemFull: function()
    {
        this.icon = new St.Icon({icon_name: "trashcan_full", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this._trashItemBase(this.icon);
        
        let emptyIcon = new St.Icon({ icon_name: 'edit-clear', icon_type: St.IconType.SYMBOLIC, style_class: 'popup-menu-icon ' });
        this.emptyButton = new St.Button({ child: emptyIcon, tooltip_text: _("Empty Trash") });
        this.emptyButton.connect('clicked', Lang.bind(this, this._emptyTrash));
        this.addActor(this.emptyButton);
    },
    
    _clearTrashItem: function()
    {
        if (this.icon) this.removeActor(this.icon);
        if (this.label) this.removeActor(this.label);
        if (this.emptyButton) this.removeActor(this.emptyButton);
    },
    
    _checkTrashStatus: function()
    {
        let children = this.trash_file.enumerate_children('*', 0, null, null);
        if (children.next_file(null, null) == null) {
            this._clearTrashItem();
            this._trashItemEmpty();
            if (AUTO_HIDE_TRASH) {
                this.actor.visible = false;
            }
        } else {
            this._clearTrashItem();
            this._trashItemFull();
            if (AUTO_HIDE_TRASH) {
                this.actor.show();
                this.actor.visible = true;
            }
        }
    },
    
    _addTrashWatch: function()
    {
        this.monitor = this.trash_file.monitor_directory(0, null, null);
        this.monitor.connect('changed', Lang.bind(this, this._checkTrashStatus));
    },
    
    _emptyTrash: function()
    {
        new ConfirmationDialog(Lang.bind(this, this._doEmptyTrash), EMPTY_TRASH_LABEL, EMPTY_TRASH_MESSAGE, _("Cancel"), _("Empty Trash")).open();
    },

    _doEmptyTrash: function()
    {
        let children = this.trash_file.enumerate_children('*', 0, null, null);
        let child_info = null;
        while ((child_info = children.next_file(null, null)) != null) {
            let child = this.trash_file.get_child(child_info.get_name());
            child.delete(null);
        }
    },
    
    activate: function(event)
    {
        new launch().file(this.trash_file.get_uri());
        PopupMenu.PopupBaseMenuItem.prototype.activate.call(this, event);
    }

};



/**
 * Modal confirmation dialog box
 */
function ConfirmationDialog()
{
    this._init.apply(this, arguments);
}

ConfirmationDialog.prototype =
{
    __proto__: ModalDialog.ModalDialog.prototype,

    _init: function(doMethod, dialogLabel, dialogMessage, cancelButtonLabel, doButtonLabel)
    {
        ModalDialog.ModalDialog.prototype._init.call(this, { styleClass: null });

        let mainContentBox = new St.BoxLayout({ style_class: 'polkit-dialog-main-layout', vertical: false });
        this.contentLayout.add(mainContentBox, { x_fill: true, y_fill: true });

        let messageBox = new St.BoxLayout({ style_class: 'polkit-dialog-message-layout', vertical: true });
        mainContentBox.add(messageBox, { y_align: St.Align.START });

        this._subjectLabel = new St.Label({ style_class: 'polkit-dialog-headline', text: dialogLabel });

        messageBox.add(this._subjectLabel, { y_fill: false, y_align: St.Align.START });

        this._descriptionLabel = new St.Label({ style_class: 'polkit-dialog-description', text: dialogMessage });

        messageBox.add(this._descriptionLabel, { y_fill: true, y_align: St.Align.START });

        this.setButtons([
            {
                label: cancelButtonLabel,
                action: Lang.bind(this, function() {
                    this.close();
                }),
                key: Clutter.Escape
            },
            {
                label: doButtonLabel,
                action: Lang.bind(this, function() {
                    this.close();
                    doMethod();
                })
            }
        ]);
    }
};



/**
 * The applet itself
 */
function MyExtension(orientation)
{
    this._init(orientation);
}

MyExtension.prototype =
{
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function()
    {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "folder");
        this.setTooltip(_("Places"));

        this._display();
    },

    on_applet_clicked: function(event)
    {
        this.menu.toggle();        
    },

    _display : function()
    {
        
        // Show default places section - not used on this version.
        //this._createDefaultPlaces();
        
        // Show home section
        this._createHome();

        // Show desktop section
        /* Buggy and not implemented yet.
        if (SHOW_DESKTOP) {
            this._createDesktop();
        }
        */

        // Show trash item
        this._createTrash();

        // Show bookmarks section
        if (SHOW_BOOKMARKS) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            if (COLLAPSE_BOOKMARKS) {
                this._bookmarksSection = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
                this.menu.addMenuItem(this._bookmarksSection);
                this._createBookmarks();
            } else {
                this._bookmarksSection = new PopupMenu.PopupMenuSection();
                this._createBookmarks();
                this.menu.addMenuItem(this._bookmarksSection);
            }
            
            //this._addBookmarksWatch();
            Main.placesManager.connect('bookmarks-updated', Lang.bind(this, this._redisplayBookmarks));
        }   
        
        // Show computer item
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._createComputer();

        // Show devices section
        if (SHOW_DEVICES) {
            if (COLLAPSE_DEVICES) {
                this._devicesSection = new PopupMenu.PopupSubMenuMenuItem(_("Removable Devices"));
                this.menu.addMenuItem(this._devicesSection);
                this._createDevices();
            } else {
                this._devicesSection = new PopupMenu.PopupMenuSection();
                this._createDevices();
                this.menu.addMenuItem(this._devicesSection);
            }
            
            Main.placesManager.connect('mounts-updated', Lang.bind(this, this._redisplayDevices));
        }

        // Show network section
        if (SHOW_NETWORK) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            if (COLLAPSE_NETWORK) {
                this._networkSection = new PopupMenu.PopupSubMenuMenuItem(_("Network"));
                this.menu.addMenuItem(this._networkSection);
                this._createNetwork();
            } else {
                this._networkSection = new PopupMenu.PopupMenuSection();
                this._createNetwork();
                this.menu.addMenuItem(this._networkSection);
            }
        }

        // Show search section
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._createSearch();

        // Show recent documents section
        if (SHOW_RECENT_DOCUMENTS) {
            this.RecentManager = new Gtk.RecentManager();

            //this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._recentSection = new PopupMenu.PopupSubMenuMenuItem(_("Recent documents"));
            this.menu.addMenuItem(this._recentSection);
            this._createRecent();
            
            this.RecentManager.connect('changed', Lang.bind(this, this._redisplayRecent));
        }
        
    },

    /**
     * Build computer section
     */
    _createComputer: function()
    {
        let icon = new St.Icon({icon_name: "computer", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.computerItem = new MenuItem(icon, _("Computer"));
        this.computerItem.connect('activate', function(actor, event) {
            new launch().command("nautilus computer://");
        });
        this.menu.addMenuItem(this.computerItem);
    },

    /**
     * Build home section
     */
    _createHome: function()
    {
        let icon = new St.Icon({icon_name: "user-home", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.homeItem = new MenuItem(icon, _("Home Folder"));
        this.homeItem.connect('activate', function(actor, event) {
            new launch().command("nautilus");
        });
        this.menu.addMenuItem(this.homeItem);
    },

    /**
     * Build desktop section
     */
    _createDesktop: function()
    {
        let icon = new St.Icon({icon_name: "user-desktop", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.desktopItem = new MenuItem(icon, _("Desktop"));
        this.desktopItem.connect('activate', function(actor, event) {
            new launch().command("nautilus \"" + FileUtils.getUserDesktopDir().replace(" ","\ ") + "\"");
        });
        this.menu.addMenuItem(this.desktopItem);
    },

    /**
     * Build default places section
     */
    _createDefaultPlaces : function()
    {
        this.defaultPlaces = Main.placesManager.getDefaultPlaces();
        for (let placeid = 0; placeid < this.defaultPlaces.length; placeid++) {
            let icon = this.defaultPlaces[placeid].iconFactory(ICON_SIZE);
            let defaultItem = new MenuItem(icon, _(this.defaultPlaces[placeid].name));
            defaultItem.place = this.defaultPlaces[placeid];
            
            defaultItem.connect('activate', function(actor, event) {
                actor.place.launch();
            });
            this.menu.addMenuItem(defaultItem);
        }
    },

    /**
     * Build trash section
     */
    _createTrash: function()
    {
        this.trashItem = new TrashMenuItem(_("Trash"));
        this.menu.addMenuItem(this.trashItem);
    },

    /**
     * Build bookmarks section
     */
    _createBookmarks : function()
    {
        this.bookmarks = Main.placesManager.getBookmarks();

        sectionMenu = (this._bookmarksSection.menu) ? this._bookmarksSection.menu : this._bookmarksSection;

        for (let bookmarkid = 0; bookmarkid < this.bookmarks.length; bookmarkid++) {
            let icon = this.bookmarks[bookmarkid].iconFactory(ICON_SIZE);
            let bookmarkItem = new MenuItem(icon, this.bookmarks[bookmarkid].name);
            bookmarkItem.place = this.bookmarks[bookmarkid];
            
            bookmarkItem.connect('activate', function(actor, event) {
                actor.place.launch();
            });
            sectionMenu.addMenuItem(bookmarkItem);
        }
    },
    
    /**
     * Method for testing purposes - do not use !!! 
     */
    _addBookmarksWatch: function()
    {
        this.bookmarks_file = Gio.file_new_for_path("~/.gtk-bookmarks");
        this.monitor = this.bookmarks_file.monitor_file(0, null, null);
        this.monitor.connect('changed', Lang.bind(this, this._redisplayBookmarks));
    },
    
    _clearBookmarks : function()
    {
        sectionMenu = (this._bookmarksSection.menu) ?  this._bookmarksSection.menu : this._bookmarksSection;
        this._bookmarksSection.removeAll();
    },

    _redisplayBookmarks: function()
    {
        this._clearBookmarks();
        this._createBookmarks();
    },

    /**
     * Build devices section
     */
    _createDevices : function()
    {
        this.devices = Main.placesManager.getMounts();
        
        sectionMenu = (this._devicesSection.menu) ? this._devicesSection.menu : this._devicesSection;

        for (let devid = 0; devid < this.devices.length; devid++) {
            let icon = this.devices[devid].iconFactory(ICON_SIZE);
            let deviceItem = new DeviceMenuItem(this.devices[devid], icon, this.devices[devid].name);
            sectionMenu.addMenuItem(deviceItem);
        }

        if (this.devices.length == 0) {
            this._devicesSection.actor.hide();
        } else {
            this._devicesSection.actor.show();
        }
    },

    _clearDevices : function()
    {
        sectionMenu = (this._devicesSection.menu) ? this._devicesSection.menu : this._devicesSection;
        sectionMenu.removeAll();
    },

    _redisplayDevices: function()
    {
        this._clearDevices();
        this._createDevices();
    },

    /**
     * Build network section
     */
    _createNetwork: function()
    {
        sectionMenu = (this._networkSection.menu) ? this._networkSection.menu : this._networkSection;
        
        let icon = new St.Icon({icon_name: "network-workgroup", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.networkItem = new MenuItem(icon, _("Network"));
        this.networkItem.connect('activate', function(actor, event) {
            new launch().command("nautilus network:///");
        });
        sectionMenu.addMenuItem(this.networkItem);
        
        let icon = new St.Icon({icon_name: "gnome-globe", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.connectItem = new MenuItem(icon, _("Connect to..."));
        this.connectItem.connect('activate', function(actor, event) {
            new launch().command("nautilus-connect-server");
        });        
        sectionMenu.addMenuItem(this.connectItem);
    },


    /**
     * Build search section
     */
    _createSearch: function()
    {
        let icon = new St.Icon({icon_name: "search", icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
        this.searchItem = new MenuItem(icon, _("Search"));
        this.menu.addMenuItem(this.searchItem);

        this.searchItem.connect('activate', function(actor, event) {
            new launch().command("gnome-search-tool");
        });
    },

    /**
     * Build recent documents section
     */
    _createRecent: function()
    {
        let id = 0;

        if (this.RecentManager.size > 0) {
            let items = this.RecentManager.get_items();
            while (id < RECENT_ITEMS && id < this.RecentManager.size) {
                let icon =  new St.Icon({icon_name: items[id].get_mime_type().replace("\/","-"), icon_size: ICON_SIZE, icon_type: St.IconType.FULLCOLOR});
                let recentItem = new MenuItem(icon, items[id].get_display_name());
                this._recentSection.menu.addMenuItem(recentItem);

                recentItem.connect('activate', Lang.bind(this, this._openRecentFile, items[id].get_uri()));
                id++;
            }

            this._recentSection.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            menuItem = new PopupMenu.PopupBaseMenuItem();
            let label = new St.Label({ text: _("Clear list") });
            menuItem.addActor(label, { align: St.Align.END });
            let icon = new St.Icon({ icon_name: "edit-clear", icon_type: St.IconType.SYMBOLIC, style_class: 'popup-menu-icon' });
            menuItem.addActor(icon, { align: St.Align.MIDDLE });
            this._recentSection.menu.addMenuItem(menuItem);
            
            menuItem.connect('activate', Lang.bind(this, this._clearRecent));
        }

        if (this.RecentManager.size == 0) {
            this._recentSection.actor.hide();
        } else {
            this._recentSection.actor.show();
        }
    },

    _clearRecent: function()
    {
        new ConfirmationDialog(Lang.bind(this, this._doClearRecent), CLEAR_RECENT_LABEL, CLEAR_RECENT_MESSAGE, _("Cancel"), _("Clear")).open();
    },

    _doClearRecent: function()
    {
        this.RecentManager.purge_items();
    },

    _redisplayRecent: function()
    {
        this._recentSection.menu.removeAll();
        if (this.RecentManager.size == 0) {
            this._recentSection.actor.visible = false;
        } else {
            this._recentSection.actor.show();
            this._recentSection.actor.visible = true;
            this._createRecent();
        }
    },

    _openRecentFile: function(a, b, c)
    {
        new launch().file(c);
    },
    
};



/**
 * Trying to centralize code to launch files or locations using different methods.
 */
function launch() {}

launch.prototype =
{
    file: function(file)
    {
        Gio.app_info_launch_default_for_uri(file, global.create_app_launch_context());
    },
    
    command: function(location)
    {
        Main.Util.spawnCommandLine(location);
    }
}



/**
 * Go!!!!!!!
 */
function init() {
}

let _indicator;

function enable() {
    _indicator = new MyExtension();

    // Icon on the LeftPanel 
    //Main.panel._leftBox.insert_actor(_indicator.actor, 1);
    //Main.panel._leftBox.child_set(_indicator.actor, { y_fill : true } );
    //Main.panel._menus.addMenu(_indicator.menu);

    // Icon on the RightPanel 
    Main.panel.addToStatusArea('all-in-one-places', _indicator);
}

function disable() {
    _indicator.destroy();
}

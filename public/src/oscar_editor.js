window.$ = $ = window.jQuery = require("jquery");
//var bootst = require('bootstrap')
require("bootstrap-table");

var localIPpromise = require("binternalip");
var ipLibrary = require("ip");
var mongoose = require("mongoose");
var editor = {};
var ipServer = "localhost";

$.get("/ipserver", function (data, status) {
  ipServer = data;
  console.log("/ipserver answered: ", data);
  initGrape();
  window.editor = editor;
});

function initGrape() {
  editor = grapesjs.init({
    dragMode: "absolute",
    height: "100%",
    container: "#gjs",
    fromElement: true,
    allowScripts: 1,
    canvas: {
      styles: ["assets/css/toggle.css"],
    },
    panels: {},
    assetManager: {
      assets: [
        "images/fruits/emoji-apple.png",
        "images/fruits/emoji-apple-click.png",
        "images/fruits/emoji-orange.png",
        "images/fruits/emoji-orange-click.png",
        "images/fruits/emoji-banana.png",
        "images/fruits/emoji-banana-click.png",
        "images/fruits/background.png",
        // Pass an object with your properties
        {
          type: "image",
          src: "http://placehold.it/350x250/459ba8/fff/image2.jpg",
          height: 350,
          width: 250,
        },
        {
          type: "image",
          src: "http://placehold.it/350x250/78c5d6/fff/image1.jpg",
          height: 200,
          width: 200,
        },
        {
          // As the 'image' is the base type of assets, omitting it will
          // be set as `image` by default
          src: "http://placehold.it/350x250/79c267/fff/image3.jpg",
          height: 350,
          width: 250,
        },
      ],
    },
    styleManager: {},
    blockManager: {},
    traitManager: {},
    //Persistance
    // Default configurations
    storageManager: {
      id: "gjs-", // Prefix identifier that will be used on parameters
      //type: 'local',          // Type of the storage
      //type: null,          // Type of the storage
      type: "local", // Type of the storage
      stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
      autosave: true, // Store data automatically
      autoload: true, // Autoload stored data on init
      contentTypeJson: true,
    },
    // TO READ: this plugin loads default blocks
    plugins: [
      "oscar_socket",
      "oscar_ip",
      "oscar_button",
      "oscar_slider",
      "gjs-preset-webpage",
      "grapesjs-custom-code",
      "grapesjs-parser-postcss",
      "grapesjs-touch",
      "grapesjs-tooltip",
    ],
    pluginsOpts: {
      oscar_socket: {
        ipserver: ipServer,
      },
      oscar_slider: {
        ipserver: ipServer,
      },
      oscar_button: {
        ipserver: ipServer,
      },
      "grapesjs-tooltip": {},
      "gjs-preset-webpage": {
        blocks: [],
        formsOpts: false,
        exportOpts: false,
        navbarOpts: false,
        countdownOpts: false,
        showStylesOnChange: true,
        modalImportTitle: "Import Template",
        modalImportLabel:
          '<div style="margin-bottom: 10px; font-size: 13px;">Paste here your HTML/CSS and click Import</div>',
        modalImportContent: function (editor) {
          return editor.getHtml() + "<style>" + editor.getCss() + "</style>";
        },
      },
    },
  });
  // Define Panels, Modals and Commdans
  var pn = editor.Panels;
  var modal = editor.Modal;
  var commands = editor.Commands;

  //END EDITOR INIT

  //FIXES MODAL FOR CUSTOM CODE PLUGIN
  editor.on("run:custom-code:open-modal", () =>
    editor.once("modal:close", () => {
      const { Commands } = editor;
      if (Commands.isActive("custom-code:open-modal")) {
        Commands.stop("custom-code:open-modal");
      }
    })
  );

  //OPEN MODAL IF UPDATE
  editor.on("load", () => {
    $.ajax({
      type: "POST",
      url: "/update",
    })
      .done(function (result) {
        console.log(result);
        if (result.title) {
          var mdlClass = "modal-login";
          var mdlDialog = document.querySelector(".gjs-mdl-dialog");
          mdlDialog.className += " " + mdlClass;
          modal.setTitle(result.title);
          modal.setContent(result.content);
          modal.open();
        }
      })
      .fail(function (jqXHR, textStatus) {
        console.log(jqXHR);
      });
  });

  //Turn OFF editable mode on Preview
  editor.on("run:preview", () => {
    // Execute a callback on all inner components starting from the root
    var res = editor.store((res) => console.log("Store callback"));
    console.log(res);
    editor.DomComponents.getWrapper().onAll((comp) =>
      comp.set({
        editable: false,
        draggable: false,
      })
    );
    const domComponents = editor.DomComponents;
    var code = domComponents.getComponents();
    $.ajax({
      type: "POST",
      url: "/save/preview",
      data: {
        project: res,
      },
    })
      .done(function (result) {
        var msg = JSON.parse(result);
        console.log(msg);
      })
      .fail(function (jqXHR, textStatus) {
        console.log(jqXHR);
      });
    //console.log("Components: ", code.models);
    //editor.socket.emit("code", code);
  });

  //Turn ON editable mode on Preview
  editor.on("stop:preview", () => {
    // Execute a callback on all inner components starting from the root
    editor.DomComponents.getWrapper().onAll((comp) =>
      comp.set({
        editable: true,
        draggable: true,
      })
    );
  });

  //FIXES MODAL FOR IMPORT HTML CODE
  editor.on("run:gjs-open-import-webpage", () =>
    editor.once("modal:close", () => {
      const { Commands } = editor;
      if (Commands.isActive("gjs-open-import-webpage")) {
        Commands.stop("gjs-open-import-webpage");
      }
    })
  );

  //Set General MODAL
  function setModal(title, namecontainer, buttonclicked) {
    var mdlClass = "modal-login";
    var container = document.getElementById(namecontainer);
    var mdlDialog = document.querySelector(".gjs-mdl-dialog");
    mdlDialog.className += " " + mdlClass;
    container.style.display = "block";
    modal.setTitle(title);
    modal.from = buttonclicked;
    modal.setContent(container);
    modal.open();
    modal.getModel().once("change:open", function () {
      mdlDialog.className = mdlDialog.className.replace(mdlClass, "");
    });
  }

  //FORM LogginIn
  $("#login_button").click(function (e) {
    e.preventDefault();
    showLoader();
    $("#login-messages-div").hide();
    var email = $("#email").val();
    var password = $("#password").val();
    $.ajax({
      type: "POST",
      url: "/auth",
      data: {
        email: email,
        password: password,
      },
      dataType: "html",
    })
      .done(function (result) {
        hideLoader();
        var msg = JSON.parse(result);
        console.log("token: ", msg.token);
        window.localStorage.setItem("token", msg.token);
        console.log(
          "token after loggin:",
          window.localStorage.getItem("token")
        );
        isloggedIn(modal.from + "");
        RemoteStorage.set({
          id: "gjs-", // Prefix identifier that will be used on parameters
          //type: 'local',          // Type of the storage
          //type: null,          // Type of the storage
          type: "remote", // Type of the storage
          stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
          urlStore: "http://" + ipServer + ":8080/save",
          urlLoad: "http://" + ipServer + ":8080/load",
          autosave: false, // Store data automatically
          autoload: false, // Autoload stored data on init
          contentTypeJson: true,
          params: { x_auth_token: msg.token },
          headers: { x_auth_token: msg.token },
        });
      })
      .fail(function (jqXHR, textStatus) {
        hideLoader();
        window.localStorage.removeItem("token");
        var msg = JSON.parse(jqXHR.responseText);
        if (typeof msg.msg != "undefined") {
          $("#login-messages").html(msg.msg);
          $("#login-messages-div").show();
        }
      });
  });

  //FORM LogginOut
  $(".logout-button").click(function () {
    console.log(editor.StorageManager.get("remote"));
    window.localStorage.removeItem("token");
    console.log("token after logout:", window.localStorage.getItem("token"));
    RemoteStorage.set({
      id: "gjs-", // Prefix identifier that will be used on parameters
      //type: 'local',          // Type of the storage
      //type: null,          // Type of the storage
      type: "remote", // Type of the storage
      stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
      urlStore: "http://" + ipServer + ":8080/save",
      urlLoad: "http://" + ipServer + ":8080/load",
      autosave: false, // Store data automatically
      autoload: false, // Autoload stored data on init
      contentTypeJson: true,
      params: { x_auth_token: null },
      headers: { x_auth_token: null },
    });
    modal.close();
    console.log(editor.StorageManager.get("remote"));
    // $.ajax({
    //   type: "GET",
    //   url: "/logout",
    //   dataType: "html",
    // }).done(function (result) {
    //   modal.close();
    // });
  });
  function showLoader() {
    $("#login-form").hide();
    $("#table-container").hide();
    $("#loader").show();
    $("#loader-table").show();
  }
  function hideLoader() {
    $("#login-form").show();
    $("#table-container").show();
    $("#loader").hide();
    $("#loader-table").hide();
  }
  //Check If user is loggedIn
  function isloggedIn(type) {
    var isAutenthicated = false;
    setModal("Login", "login-panel", type);
    //console.log(window.localStorage.getItem("token"));
    $.ajax({
      url: "/auth/user",
      type: "post",
      data: {},
      headers: {
        x_auth_token: window.localStorage.getItem("token"), //If your header name has spaces or any other char not appropriate
      },
      dataType: "json",
      success: function (data) {
        isAutenthicated = true;
        //console.log("success auth");
        console.info(data);
        initTable();
        updateProjects();
        setModal(type, "table-panel");
        if (type == "Save") {
          $("#load-button").hide();
          $("#save-button").show();
        } else if (type == "Load") {
          $("#load-button").show();
          $("#save-button").hide();
        }
      },
      error: function (data, status) {
        isAutenthicated = false;
        //console.log("fail auth");
        //console.info(data);
        setModal("Login", "login-panel", type);
      },
    });
  }
  function initTable() {
    var token = window.localStorage.getItem("token");
    //Check error in projects Table
    $("#projects-table").bootstrapTable({
      url: "/projects",
      ajaxOptions: {
        headers: { x_auth_token: token },
      },
      height: 300,
      columns: [
        {
          title: "Name",
          field: "name",
          sortable: true,
        },
        {
          title: "Size",
          field: "size",
          sortable: true,
        },
        {
          title: "Date",
          field: "date",
          sortable: true,
        },
        {
          title: "Actions",
          field: "action",
          clickToSelect: false,
          events: window.operateEvents,
          formatter: operateFormatter,
        },
      ],
      pagination: false,
      search: false,
      sortable: true,
      pageSize: 5,
      pageList: [],
      clickToSelect: true,
      singleSelect: true,
      onClickRow: function (row, $element) {
        $("#project-name").val(row.name);
        $("#project-name").attr("id-project", row._id);
        // row: the record corresponding to the clicked row,
        // $element: the tr element.
      },
      onLoadError: function (status, jqXHR) {
        //alert(status);
        console.log(jqXHR);
      },
    });
  }
  //Check for projects
  function updateProjects() {
    var token = window.localStorage.getItem("token");
    console.log("token in local storage:");
    console.log(token);
    $("#projects-table").bootstrapTable("refreshOptions", {
      url: "/projects",
      ajaxOptions: {
        headers: { x_auth_token: token },
      },
    });
  }
  window.operateEvents = {
    "click .like": function (e, value, row, index) {
      alert("You click like action, row: " + JSON.stringify(row));
    },
    "click .remove": function (e, value, row, index) {
      //console.log(row);
      //delete
      $.confirm({
        title: "Delete Project",
        content:
          "Are you sure you want to delete this project. You won't be able to recover it afterwards",
        buttons: {
          confirm: function () {
            $.ajax({
              type: "DELETE",
              url: "/remove/" + row._id,
              headers: {
                x_auth_token: window.localStorage.getItem("token"), //If your header name has spaces or any other char not appropriate
              },
              success: function (data) {
                $("#projects-table").bootstrapTable("refresh");
                $.alert(data.msg);
              },
              error: function (err) {
                console.log("error");
                console.log(err);
                $.alert(err);
              },
            });
          },
          cancel: function () {},
        },
      });
    },
  };

  function operateFormatter(value, row, index) {
    return [
      '<a class="remove icon" href="javascript:void(0)" title="Remove">',
      '<i class="fa fa-times-circle"></i>',
      "</a>",
    ].join("");
  }

  // Open Modal Command
  var mdlClass = "gjs-mdl-dialog-sm";
  commands.add("open-modal-login", (editor, sender, options = {}) => {
    //If it is save or load check if it is logged In
    if (options.type) {
      isloggedIn(options.type);
    }
    $("#login-messages-div").hide();
    var mdlDialog = document.querySelector(".gjs-mdl-dialog");
    mdlDialog.className += " " + mdlClass;
    modal.open();
    modal.getModel().once("change:open", function () {
      mdlDialog.className = mdlDialog.className.replace(mdlClass, "");
    });
  });

  //Add Save Panel Button
  pn.addButton("options", {
    id: "open-save",
    className: "fa fa-cloud-upload",
    command: function () {
      editor.runCommand("open-modal-login", {
        type: "Save",
      });
    },
    attributes: {
      title: "Save",
      "data-tooltip-pos": "bottom",
    },
  });
  //Add Load Panel Button
  pn.addButton("options", {
    id: "open-load",
    className: "fa fa-cloud-download",
    command: function () {
      editor.runCommand("open-modal-login", {
        type: "Load",
      });
    },
    attributes: {
      title: "Load",
      "data-tooltip-pos": "bottom",
    },
  });
  //Add About Button
  pn.addButton("options", {
    id: "open-info",
    className: "fa fa-question-circle",
    command: function () {
      setModal("About", "info-panel");
      editor.runCommand("open-modal-login");
    },
    attributes: {
      title: "About",
      "data-tooltip-pos": "bottom",
    },
  });

  editor.on("run:open-modal-login", function () {});

  const RemoteStorage = editor.StorageManager.get("remote").set({
    id: "gjs-", // Prefix identifier that will be used on parameters
    //type: 'local',          // Type of the storage
    //type: null,          // Type of the storage
    type: "remote", // Type of the storage
    stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
    urlStore: "http://" + ipServer + ":8080/save",
    urlLoad: "http://" + ipServer + ":8080/load",
    autosave: false, // Store data automatically
    autoload: false, // Autoload stored data on init
    contentTypeJson: true,
    params: { x_auth_token: window.localStorage.getItem("token") },
    headers: { x_auth_token: window.localStorage.getItem("token") },
  });

  //Save and Load
  const LocalStorage = editor.StorageManager.get("local");
  console.log("storages", editor.StorageManager.getStorages());

  // Save Action
  var saveName = document.getElementById("project-name");
  var saveButton = document.getElementById("save-button");
  let stored;
  saveButton.onclick = () => {
    showLoader();
    //sets the nanem of the project as parameter.
    editor.StorageManager.setCurrent("remote");
    RemoteStorage.set("params", {
      name: saveName.value,
      overwrite: false,
      visibility: "private",
    });
    stored = editor.store((res) => {
      hideLoader();
      editor.StorageManager.setCurrent("local");
      console.log("res", res);
      if (typeof res.error != "undefined") {
        $.alert(res.error);
      } else if (typeof res.confirm != "undefined") {
        $.confirm({
          title: "Overwriting",
          content: res.confirm,
          buttons: {
            confirm: function () {
              RemoteStorage.set("params", {
                name: saveName.value,
                overwrite: true,
                visibility: "private",
              });
              editor.StorageManager.setCurrent("remote");
              editor.store((e) => {
                hideLoader();
                editor.StorageManager.setCurrent("local");
                if (typeof e.error != "undefined") {
                  $.alert(e.error);
                }
                $.alert(e.msg);
              });
              modal.close();
            },
            cancel: function () {
              hideLoader();
            },
          },
        });
      } else {
        $.alert(res.msg);
        modal.close();
      }
    });
  };
  // Load Action
  var loadName = document.getElementById("project-name");
  var loadButton = document.getElementById("load-button");
  $("#project-name").change(function () {
    //alert("changed");
    //mongoose.Types.ObjectId.isValid
    if (mongoose.Types.ObjectId.isValid($("#project-name").val())) {
      $("#project-name").attr("id-project", $("#project-name").val());
    }
  });

  loadButton.onclick = () => {
    showLoader();
    $.confirm({
      title: "Load",
      content:
        "If you load this project, you will lose all information of your current project",
      buttons: {
        confirm: function () {
          RemoteStorage.set({
            urlLoad:
              "http://" +
              ipServer +
              ":8080/load/" +
              loadName.getAttribute("id-project"),
          });
          editor.StorageManager.setCurrent("remote");
          editor.load((res) => {
            hideLoader();
            console.log("res: " + res);
            if (Object.keys(res).length === 0) {
              //console.log("loaded: " + res);
              $.alert("Project doesn't exist or You are not Logged In");
            } else {
              //console.log('loaded', res)
              if (res.error) {
                $.alert("Check Your Internet Connection");
              } else {
                $.alert("Loaded Successfully");
                modal.close();
              }
            }
            editor.StorageManager.setCurrent("local");
          });
        },
        cancel: function () {
          hideLoader();
        },
      },
    });
  };

  //Upgrade
  $.get("/upgrade", function (data, status) {
    if (data.success) {
      //Add Notification
    }
  });

  //Create IP Label
  var IPLabel = pn.addButton("devices-c", {
    id: "ipButton",
    className: "someClass",
    label: "IP: ",
    command: null,
    attributes: {
      title: "Server IP",
    },
    active: false,
    disable: true,
  });

  getipServer();

  function getipServer() {
    IPLabel.set("label", "Server IP: " + editor.ipserver);
  }

  //Default value of editor.ip is localhost
  editor.ip = "localhost";

  localIPpromise.then((ipAddr) => {
    var ipv4 = "";
    for (let i = 0; i < ipAddr.length; i++) {
      if (ipLibrary.isV4Format(ipAddr[i])) {
        ipv4 = ipAddr[i];
        editor.ip = ipv4;
      }
    }
    if (editor.ip == "" || !ipLibrary.isV4Format(editor.ip)) {
      editor.ip = "localhost";
      //IPLabel.set("label", "Client IP: " + editor.ip);
    }
    console.log("editor.ip: ", editor.ip);
  });
  localIPpromise.catch((error) => {
    console.log("Error: ", error);
    editor.ip = "localhost";
    IPLabel.set("label", "IP: " + editor.ip);
  });

  // Add and beautify tooltips
  [
    ["sw-visibility", "Show Borders"],
    ["preview", "Preview"],
    ["fullscreen", "Fullscreen"],
    ["export-template", "See Code"],
    ["undo", "Undo"],
    ["redo", "Redo"],
    ["gjs-open-import-webpage", "Import"],
    ["canvas-clear", "Clear canvas"],
  ].forEach(function (item) {
    pn.getButton("options", item[0]).set("attributes", {
      title: item[1],
      "data-tooltip-pos": "bottom",
    });
  });
  [
    ["open-sm", "Style Manager"],
    ["open-tm", "OSC Settings"],
    ["open-layers", "Layers"],
    ["open-blocks", "Blocks"],
  ].forEach(function (item) {
    pn.getButton("views", item[0]).set("attributes", {
      title: item[1],
      "data-tooltip-pos": "bottom",
    });
  });
  var titles = document.querySelectorAll("*[title]");
  for (var i = 0; i < titles.length; i++) {
    var el = titles[i];
    var title = el.getAttribute("title");
    title = title ? title.trim() : "";
    if (!title) break;
    el.setAttribute("data-tooltip", title);
    el.setAttribute("title", "");
  }
  // Show borders by default
  //pn.getButton('options', 'sw-visibility').set('active', 1);
}

"use strict";
// Elementos modales
const modalAddUser = document.getElementById("modal-add-user");
const modalDeleteTable = document.getElementById("modal-delete-table");
const modalDeleteRegistro = document.getElementById("modal-delete-registro");
const modalDeepSearch = document.getElementById("modal-search-user-deep");

// Elementos de Interfaz de tabla 
const tableUser = document.getElementById("table-user");  // tabla general (padre)
const tableOptions = document.getElementById("table-options"); // Box de las opciones principales (buscar, Añadir, eliminar tabla)
const boxData = tableUser.querySelector(".box-data"); // Contenedor de los datos de la tabal

//============= Compomente (template user) ==================
const templateDataUser = document.getElementById("template-user");
const templateTableVacio = document.getElementById("template-vacio");
//===========================================================

// DATABASE 
let db; 

const DBRequest = indexedDB.open("MyDatabase", 1)

// Eventos del IDBRequest (caso de no tener la DB o esa versión)
DBRequest.addEventListener("upgradeneeded", (e)=>{
    const db = e.target.result;
    const store = db.createObjectStore("usuarios",{
        keyPath: "id",
        autoIncrement: true
    })

    store.createIndex("nombre", "nombre", {unique: false});
    store.createIndex("edad", "edad", {unique:false}); 
    store.createIndex("email", "email", {unique:true});
})

// Caso de Exito
DBRequest.addEventListener("success", (e)=>{
    db = e.target.result;
    console.info("DATABASE cargada con exito...")

    ReadDataFromTable()
        .then(data => RenderData(data))
        .catch(err => console.error(err))
})

// En caso de fallar
DBRequest.addEventListener("error", (e)=> console.log(`Ocurrió un error al cargar la DATABASE: ${e.target.error.name} - ${e.target.error.message}`)); 

// CRUD 
// Create : Crear o Añadir registros 
function AddUserForTable(name, age, email){
    return new Promise((res, rej)=>{
        name = name.trim(); 
        email= email.trim()
        if(!db){
            rej("La Base de Datos no está lista aún...");
            return;
        }
        const object = {
            name,
            age,
            email
        }
        const transaccion = db.transaction("usuarios", "readwrite");
        const store = transaccion.objectStore("usuarios");
        const request = store.add(object);
        request.addEventListener("success", () =>{
            res("Exito...")
        })

        request.addEventListener("error", (e)=> rej(`Error al agregar: ${e.target.error.name} - ${e.target.error.message}`));
    })
}

// Read : Leer datos
let listData = [];
function  ReadDataFromTable() {
    return new Promise((res, rej) => {
        if(!db){
            rej("La Base de Datos no está lista aún...");
            return;
        }
        listData = [];
        const transaccion = db.transaction("usuarios", "readonly"); 
        const store = transaccion.objectStore("usuarios"); 
        const cursorRequest = store.openCursor();
        cursorRequest.addEventListener("success", (e)=>{
            const cursor = e.target.result; 
            if(cursor){
                // console.log(cursor);
                // cursor.value contiene al objeto
                const object = cursor.value
                listData.push(object)
                cursor.continue(); // pasa al siguiente registro
            }
            else{
                if(listData.length === 0){
                    console.info("No hay datos que agregar")
                    res([])
                }
                else{
                    // console.log(listData);
                    console.info("No hay más registros...")
                    res(listData)

                }

            }
        })

        cursorRequest.addEventListener("error", (e)=> rej(`Error al leer datos: ${e.target.error.message}`))
    })
}

// BUSQUEDA POR MEDIO DE FILTROS (EN EL listData)
function GetDataByFilter(filter){
    return new Promise((res, rej)=>{
        if(listData.length === 0) {
            res([]); 
            return;
        }

        if(typeof filter === "string"){
            filter = filter.trim().toLowerCase();
            const result = listData.filter(user =>{
                const valor =  user.name.toLowerCase().includes(filter) ||
                              String(user.age) === filter || 
                              user.email.toLowerCase().trim().includes(filter) || 
                              String(user.id) === filter; 
                return valor; 
            })
            res(result);
            return;
        }

        const name = (filter.name || "").trim().toLowerCase(); 
        const email = (filter.email || "").trim().toLowerCase();
        const age = filter.age || "";
        const id = filter.id || "";
        const  result = listData.filter(user =>{
            const nombre = !name || user.name.toLowerCase().includes(name); 
            const edad = !age || String(user.age) === age; 
            const correo = !email || user.email.toLowerCase().includes(email);
            const idNum = !id || String(user.id) === id; 

            return nombre && edad && correo && idNum;
        })

        res(result); 
        return;
    })
}

// Update : Actualizar o Modificar un Registro 
function UpdateRegistro({name = "", age = "", email = "", id = ""}){
    return new Promise((resolve, reject) => {
        if(!db){
            reject("La Base de Datos no está lista...")
            return;
        };

        if(!id){
            reject("Se necesita un ID para esta acción...");
            return;
        }

        const transaccion = db.transaction("usuarios", "readwrite"); 
        const store = transaccion.objectStore("usuarios");
        const IDBRequest = store.get(Number(id)); 
        IDBRequest.addEventListener("success", (e)=>{
            const data = e.target.result;
            if(!data){
                reject("Id sin registro"); 
                return; 
            }
            name = name.trim().toLowerCase(); 
            age = age.trim();
            email = email.trim().toLowerCase();

            if(name !== undefined && name !== "") data.name = name; 
            if(age !== undefined && age !== "" && !(isNaN(age))) data.age = Number(age);
            if(email !== undefined && email !== "") data.email = email; 

           const request = store.put(data);
           request.addEventListener("success", ()=> resolve(data));
           request.addEventListener("error", e => reject(`Error al Actualizar: ${e.target.error.name} - ${e.target.error.message}`))

        })

        IDBRequest.addEventListener("error", (e)=>{
            reject(`Error: ${e.target.error.name} - ${e.target.error.message}`)
        })
    })
    
}

// Delete :  Elimar uno o todos los Registros 
function DeleteData(id= "", confirm= false){
    return new Promise((res, rej) =>{
        if(!db){
            rej("La Base de Datos no está lista...")
            return;
        }

        const transaccion = db.transaction("usuarios", "readwrite"); 
        const store = transaccion.objectStore("usuarios");
        if(id === "" && confirm === true){
            const clearStore = store.clear(); 
            clearStore.addEventListener("success", ()=> res("Todos los registros fueron eliminados"));
            clearStore.addEventListener("error", (e)=> rej(`Error al borrar los registros: ${e.target.error.name} - ${e.target.error.message}`));
            listData = [];
            return;
        }
        else if(id !== undefined && id !== "" && !(isNaN(id)) && confirm === true){
            id = Number(id);
            const IDBRequest = store.get(id); 
            IDBRequest.addEventListener("success", (e)=>{
                if(!e.target.result){
                    rej(`No existe ningún registro con id ${id}`); 
                    return;
                }

                const request = store.delete(id);
                request.addEventListener("success", ()=> res("Registro eliminado correctamente..."));
                request.addEventListener("error", e => rej(`Error al Eliminar el Registro: ${e.target.error.name} - ${e.target.error.message}`));
                listData = listData.filter(u => u.id !== id);
            })

            IDBRequest.addEventListener("error", e =>{
                rej(`Error: ${e.target.error.name} - ${e.target.error.message}`)
            })
        }
    })
}

// FUNCIONES 
// RENDERIZAR TODOS LOS DATOS DE LA DB AL DOOM 
function RenderData(listDB){
    boxData.innerHTML = ""; 

    const fragmento = document.createDocumentFragment(); 
    if(listDB.length === 0){
        const clone = templateTableVacio.content.cloneNode(true); 
        fragmento.appendChild(clone);
    }

    for(let i = 0; i < listDB.length; i++){
        const object = listDB[i]; 

        const clone = templateDataUser.content.cloneNode(true); 

        const boxDataUser = clone.querySelector(".box-data-user"); 
        const boxUser = boxDataUser.querySelector(".box-user"); 
        const idUser = boxUser.querySelector(".id-user"); 
        const nameUser = boxUser.querySelector(".name-user");
        const ageUser = boxUser.querySelector(".age-user"); 
        const emailUser = boxUser.querySelector(".email-user"); 

        boxDataUser.dataset.id = object.id;
        idUser.textContent = object.id;
        nameUser.value = object.name; 
        ageUser.value = object.age; 
        emailUser.value = object.email;

        fragmento.appendChild(clone);
    }

    boxData.appendChild(fragmento);
}

// IsNumero
function IsNumero(text){
    if(text.length === 0 || isNaN(text) || text < 0 || text > 130){
        return false;
    }
    return true;
}

// ValorExistente
function ValorExistente(data, propiedad){
    propiedad = propiedad.trim().toLowerCase();
    let box = data.closest(".box-data-user");
    let index = box ? Number(box.dataset.id) : undefined;
    const value = data.value.trim().toLowerCase();

    for(let x = 0; x < listData.length; x++){
        const object = listData[x]; 
        if(object[propiedad] === value){
            if(index !== undefined && object.id === index){
                continue; 
            }
            return true; 
        }
    }
    return false;
}

// OpcionModalDelete
function OpcionModalDelete(e, modal, id=""){
    const btnCancel = e.target.closest(".btn-cancel"); 
    const btnConfirm = e.target.closest(".btn-confirm");
    const fuera = e.target.classList.contains("modal");
    if(btnCancel || fuera) CloseModal(modal) 
    if(btnConfirm) ConfirmDelete(modal, id)
}

// CloseModal
function CloseModal(modal){
    modal.classList.remove("show"); 
    modal.classList.add("close");
    setTimeout(()=>{
        modal.close(); 
        modal.classList.remove("close"); 
    }, 300);
}

// ConfirmDelete
async function ConfirmDelete(modal, id){
    try{
        await DeleteData(id, true)
        const newList = await ReadDataFromTable(); 
        RenderData(newList); 
        CloseModal(modal)
    }catch(err){
        console.error(err); 
    }
}

// Modal Agregar New User 
//Resetear Valores al abrir el input 
function ResetModal(modal){
    const inputs = modal.querySelectorAll("input"); 
    inputs.forEach(element => {
        element.value = ""; 
        element.classList.remove("invalido");
    });

    const infos = modal.querySelectorAll(".danger")
    infos.forEach(element =>{
        element.textContent = ""; 
        element.classList.remove("mostrar");
    })
}

function BtnAddUser(){
    ResetModal(modalAddUser)
    modalAddUser.showModal();
    requestAnimationFrame(()=> modalAddUser.classList.add("show"))
}

modalAddUser.addEventListener("click", e =>{
    if(e.target.classList.contains("modal") || e.target.classList.contains("close-modal")) CloseModal(modalAddUser)
    if(e.target.id == "btn-addUser"){
        const nodeList = modalAddUser.querySelectorAll(".input-add"); 
        let name, age, email; 
        for(let i = 0; i < nodeList.length; i++){
            if(nodeList[i].id === "name-new-user"){
                name = nodeList[i].value;
            }
            if(nodeList[i].id === "age-new-user"){
                age = Number(nodeList[i].value); 
            }
            if(nodeList[i].id === "email-new-user"){
                email = nodeList[i].value;
            }
        }

        AddUserForTable(name, age, email)
            .then( ReadDataFromTable)
            .then(RenderData)
            .catch(e => console.log(e))
    }
})

modalAddUser.addEventListener("input", e =>{
    if(!e.target.classList.contains("input-add")) return
    VerificarValor(e)
})


// VerificarValor 
function VerificarValor(e){
    const input = e.target;
    const boxInput = input.closest(".box-input"); 
    const formulario = boxInput.closest(".formulario-Add"); 
    const listInput = formulario.querySelectorAll(".input-add"); 
    const btnAdd = document.getElementById("btn-addUser"); 
    const info = boxInput.querySelector(".danger")
    const value = input.value.trim();
    input.value = value;
    let valido = false;
    let bloqueado = true;
    
    if(!value) {
        info.classList.add("mostrar");
        input.classList.add("invalido");
        info.textContent = "No puede estar vacío"
        btnAdd.classList.add("bloqueado");
        btnAdd.disabled = true;
        return;
    }

    if(input.id === "name-new-user" && value.length >= 3) valido = true; 
    if(input.id === "age-new-user" && IsNumero(value)) valido = true; 
    if(input.id === "email-new-user" && !ValorExistente(input, "email") && value.includes("@") && value.includes(".")) valido = true;

    if(valido){
        info.classList.remove("mostrar"); 
        input.classList.remove("invalido");
        input.classList.remove("nulo"); 
        info.textContent = "";
        for(let i = 0; i < listInput.length; i++){
            if(listInput[i].classList.contains("invalido") || listInput[i].classList.contains("nulo")){
                bloqueado = true;
                break;
            }
            bloqueado = false;
        }

        if(!bloqueado){
            btnAdd.classList.remove("bloqueado");
            btnAdd.disabled = false;
        }        
        return;
    }
    
    info.classList.add("mostrar");
    input.classList.add("invalido");
    info.textContent = "Valor no válido";
    btnAdd.classList.add("bloqueado");
    btnAdd.disabled = true;
    return;
}


// BOTÓN DE BUSCAR (BUSQUEDA SIMPLE) 
const inputSearchSimple = document.getElementById("search-user");
inputSearchSimple.addEventListener("focus", e => e.target.value = e.target.value.trim())
inputSearchSimple.addEventListener("keydown", e =>{
    if(e.key === "Enter"){
        document.getElementById("btn-search-user").click()
    }
})

function BtnSearch(){
    const dataSearch = inputSearchSimple.value.trim(); 
    GetDataByFilter(dataSearch)
        .then(RenderData)
        .catch(e => console.log(e))

}

// BOTÓN DE BUSQUEDA PROFUNDA (DEEP SEARCH)
function BtnDeppSearch(){
    ResetModal(modalDeepSearch)
    modalDeepSearch.showModal();
    requestAnimationFrame(()=> modalDeepSearch.classList.add("show"))
}

modalDeepSearch.addEventListener("click", e =>{
    if(e.target.classList.contains("modal") || e.target.classList.contains("close-modal")) CloseModal(modalDeepSearch)
    if(e.target.id === "btn-searchUser"){
        const nodeList = modalDeepSearch.querySelectorAll(".user-data-filter"); 
        let id,name, age, email
        for(let i = 0; i < nodeList.length; i++){
            if(nodeList[i].id === "id-user") id = nodeList[i].value.trim().toLowerCase(); 
            if(nodeList[i].id === "name-user") name = nodeList[i].value.trim().toLowerCase() ; 
            if(nodeList[i].id === "age-user") age = nodeList[i].value.trim().toLowerCase() ; 
            if(nodeList[i].id === "email-user") email = nodeList[i].value.trim().toLowerCase() ;
        }

        GetDataByFilter({name : name, age: age, email : email, id : id})
            .then(e => {
                CloseModal(modalDeepSearch);
                RenderData(e);
            })
            .catch(e => console.log(e))
    }
})

// BOTÓN DE ELIMINAR DATOS DE TABLA 
function BtnDeleterData(){
    modalDeleteTable.showModal();
    requestAnimationFrame(()=> modalDeleteTable.classList.add("show"))
}

modalDeleteTable.addEventListener("click", e => {
    if(e.target.classList.contains("modal") || e.target.classList.contains("btn-cancel")) CloseModal(modalDeleteTable) 
    if(e.target.classList.contains("btn-confirm")){
        DeleteData("", true)
            .then(ReadDataFromTable)
            .then(e =>{
                CloseModal(modalDeleteTable);
                RenderData(e);
            })
            .catch(e => console.log(e))
    }
})

// Modal de Eliminar Registro
function BtnDeleteRegistro(btn) {
    const boxDataUser = btn.closest(".box-data-user"); 
    const index = Number(boxDataUser.dataset.id);
    modalDeleteRegistro.showModal();
    modalDeleteRegistro.dataset.index = index;
    requestAnimationFrame(()=> modalDeleteRegistro.classList.add("show"));
}

modalDeleteRegistro.addEventListener("click", (e)=>{
        OpcionModalDelete(e, modalDeleteRegistro, modalDeleteRegistro.dataset.index)
});

// Copiar Registro: 
function CopyData(btn){
    const boxDataUser = btn.closest(".box-data-user"); 
    const dataUser = boxDataUser.querySelectorAll(".data-user"); 
    let listDataCopy = []; 
    for(let i = 0; i < dataUser.length; i++){
        const data = dataUser[i]; 
        let value = data.value !== undefined ? data.value.trim() : data.textContent.trim(); 
        listDataCopy.push(value);  
    }

    const textCopy = listDataCopy.join("\t"); 
    navigator.clipboard.writeText(textCopy)
        .then(()=>{
            console.log(`Registro copiado: ${textCopy}`)
            btn.classList.add("copy");
        })
        .catch(err =>{
            console.error(`Error a copiar: ${err}`); 
            alert(`Error al copiar: ${err}`);
        })
}

// EVENTOS 
// ADVERTENCIA: ESTOY UPASANDO EN TODAS LAS FUNCIONES EL AGE Y ID COMO STRING 
// DENTRO DE ELLAS LAS CONVIERTO, ASÍ QUE DEBEMOS PASARLOS COMO STRING NO NÚMERO

// EVENTOS DEL TABLE USER 
tableOptions.addEventListener("click", e =>{
    const btnAdd = e.target.closest(".add-user");
    const btnSearch = e.target.closest(".buscar"); 
    const btnDeepSearch = e.target.closest(".deep-search"); 
    const btnDeleteData = e.target.closest(".delete-data"); 
    if(btnSearch) BtnSearch()
    if(btnAdd) BtnAddUser()
    if(btnDeepSearch) BtnDeppSearch()
    if(btnDeleteData) BtnDeleterData()
})


// Agregar Evento al BoxData para usar los btns
boxData.addEventListener("click", e =>{
    const btnModify = e.target.closest(".btn-update-user"); 
    const btnSave = e.target.closest(".btn-save-user"); 
    const btnDeleteRegistro = e.target.closest(".btn-delete-user"); 
    const btnCopy = e.target.closest(".btn-copy-user");
    if(btnModify) ButtonModify(btnModify);
    if(btnSave) ButtonSave(btnSave);
    if(btnDeleteRegistro) BtnDeleteRegistro(btnDeleteRegistro);
    if(btnCopy) CopyData(btnCopy)
})

boxData.addEventListener("focusout", e =>{
    const input = e.target.closest(".data-user"); 
    if(!input) return;
    if(input.classList.contains("id-user")) return; 
    // console.log(e.target)
    const valor = input.value.trim(); 
    if(valor.length === 0){
        input.value = input.dataset.oldValue;
    }

    input.value = valor;

    if(input.classList.contains("age-user")){
        if(!IsNumero(valor)) input.value = input.dataset.oldValue;
    }

})

// BOTON MODIFICAR 
function ButtonModify(btn){
    btn.classList.add("ocultar");
    const boxDataUser = btn.closest(".box-data-user")
    const btnSave = boxDataUser.querySelector(".btn-save-user"); 
    btnSave.classList.add("mostrar"); 

    // Campos a Modicar
    const listDataUser = boxDataUser.querySelectorAll(".data-user"); 
    for(let i = 0; i < listDataUser.length; i++){
        const data = listDataUser[i];
        if(!data.classList.contains("id-user")) {
            data.classList.add("editar");
            data.disabled = false;
            data.required = true;
            data.dataset.oldValue = data.value; 
        }
    }
}

// BOTON GUARDAR
async function ButtonSave(btn){
    const boxDataUser = btn.closest(".box-data-user");

    const listDataUser = boxDataUser.querySelectorAll(".data-user"); 
    let name, age, email, id; 
    for(let i = 0; i < listDataUser.length; i++){
        const data = listDataUser[i]; 
        if(data.classList.contains("email-user")){
            if(ValorExistente(data, "email")){
                alert(`El correro: ${data.value} ya existe`);
                return;
            }

            email = data.value;
        }

        if(data.classList.contains("name-user")) name = data.value; 
        if(data.classList.contains("age-user")) age = data.value;
        if(data.classList.contains("id-user")) id = data.textContent;  
    }

    try{
        await UpdateRegistro({name, age, email, id})
        const newList = await ReadDataFromTable();
        RenderData(newList)
    }catch(error){
        alert(error); 
        console.error(error);
    }    
}


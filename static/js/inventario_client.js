/* Cliente: lógica de carrito e interacciones (convertida desde Django template)
   Este archivo implementa búsqueda, filtros, resumen y carrito usando localStorage.
*/

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let porcentajeAplicado = parseFloat(localStorage.getItem('porcentajeAplicado')) || 0;
let productoAEliminar = null;
const codi = {
    'DESC10': 10,
    'DESCUENTO10': 10,
    'PROMO20': 20,
    'OFERTA50': 50,
    'SUPER30': 30
};

const listaCarrito   = document.getElementById('listaCarrito');
const totalTexto     = document.getElementById('total');
const preTexto       = document.getElementById('pre');
const desTexto       = document.getElementById('des');
const desMonto       = document.getElementById('des-monto');
const desRow         = document.getElementById('des-row');
const descInput      = document.getElementById('descuento');
const btndes         = document.getElementById('btn-des');
const carritoCount   = document.getElementById('carritoCount');
const cartBadge      = document.getElementById('cartBadge');
const buscador       = document.getElementById('buscadorProductos');
const productosGrid  = document.getElementById('productosGrid');
let filtroActual     = 'todos';

if (buscador) {
    buscador.addEventListener('input', aplicarFiltros);
}

function aplicarFiltros() {
    const q = buscador ? buscador.value.toLowerCase().trim() : '';
    document.querySelectorAll('.tarjeta-producto-venta').forEach(card => {
        const nombreMatch = (card.dataset.nombre || '').includes(q) || (card.dataset.id || '').includes(q);
        const estadoMatch  = filtroActual === 'todos' || card.dataset.estado === filtroActual;
        card.style.display = (nombreMatch && estadoMatch) ? '' : 'none';
    });
}

(function() {
    const cards = document.querySelectorAll('.tarjeta-producto-venta');
    let ok = 0, bajo = 0, agotado = 0;
    cards.forEach(c => {
        if (c.dataset.estado === 'ok')      ok++;
        else if (c.dataset.estado === 'bajo') bajo++;
        else if (c.dataset.estado === 'agotado') agotado++;
    });
    const elOk = document.getElementById('totalOk');
    const elBajo = document.getElementById('totalBajo');
    const elAgotado = document.getElementById('totalAgotado');
    const elTotal = document.getElementById('totalProductos');
    if (elOk) elOk.textContent = ok;
    if (elBajo) elBajo.textContent = bajo;
    if (elAgotado) elAgotado.textContent = agotado;
    if (elTotal) elTotal.textContent = cards.length;
})();

// Add to cart
document.querySelectorAll('.agregar').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = (btn.dataset.id);
        const stock = parseInt(btn.dataset.stock) || 0;
        const price = parseFloat(btn.dataset.price) || 0;
        const title = btn.dataset.title;

        if (stock <= 0) return;

        const producto = {
            id:       id,
            title:    title,
            price:    price,
            stock:    stock,
            cantidad: 1
        };
        agregarAlCarrito(producto);
    });
});

function agregarAlCarrito(producto) {
    const existe = carrito.find(p => p.id === producto.id);
    if (existe) {
        if (existe.cantidad < existe.stock) {
            existe.cantidad++;
        } else {
            alert('No hay más unidades disponibles de este producto.');
            return;
        }
    } else {
        carrito.push(producto);
    }
    guardarCarrito();
    mostrarToast();
    renderCarrito();
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function renderCarrito() {
    if (!listaCarrito) return;
    listaCarrito.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = '<div class="carrito-vacio"><i class="bi bi-cart-x carrito-vacio-icon"></i><p>Tu carrito está vacío</p></div>';
    }

    carrito.forEach(producto => {
        total += producto.price * producto.cantidad;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <div class="carrito-item-info">
                <strong class="carrito-item-nombre">${producto.title}</strong>
               <span class="carrito-item-precio">$${producto.price.toLocaleString('es-CO')} c/u</span>
            </div>
            <div class="carrito-item-controls">
                <button type="button" class="ctrl-btn ctrl-minus">−</button>
                <span class="ctrl-qty">${producto.cantidad}</span>
                <button type="button" class="ctrl-btn ctrl-plus">+</button>
                <button type="button" class="ctrl-btn ctrl-del" data-bs-toggle="modal" data-bs-target="#modalAviso">
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
           <div class="carrito-item-subtotal">$${(producto.price * producto.cantidad).toLocaleString('es-CO')}</div>
        `;
        div.querySelector('.ctrl-plus').addEventListener('click', () => {
            if (producto.cantidad < producto.stock) {
                producto.cantidad++;
                guardarCarrito();
                renderCarrito();
            } else {
                alert('Has alcanzado el límite de stock disponible.');
            }
        });
        div.querySelector('.ctrl-minus').addEventListener('click', () => {
            producto.cantidad--;
            if (producto.cantidad <= 0) {
                carrito = carrito.filter(p => p.id !== producto.id);
            }
            guardarCarrito();
            renderCarrito();
        });
        div.querySelector('.ctrl-del').addEventListener('click', () => {
            productoAEliminar = producto;
        });
        listaCarrito.appendChild(div);
    });

    let des = total * (porcentajeAplicado / 100);
    const totalFinal = total - des;
    if (preTexto) preTexto.textContent = `$${total.toLocaleString('es-CO')}`;
    if (desRow) {
        if (porcentajeAplicado > 0) {
            desRow.style.display = '';
            desTexto.textContent = `Descuento (${porcentajeAplicado}%)`;
            desMonto.textContent = `-$${des.toLocaleString('es-CO')}`;
        } else {
            desRow.style.display = 'none';
        }
    }
    if (totalTexto) totalTexto.textContent = `$${totalFinal.toLocaleString('es-CO')}`;

    if (carritoCount) carritoCount.textContent = `${carrito.length} productos`;
    if (cartBadge) {
        if (carrito.length > 0) { cartBadge.style.display = ''; cartBadge.textContent = carrito.length; }
        else { cartBadge.style.display = 'none'; }
    }
}

renderCarrito();

// Eliminar confirmado
const btnEliminar = document.getElementById('btnEliminar');
if (btnEliminar) btnEliminar.addEventListener('click', () => {
    if (productoAEliminar) {
        carrito = carrito.filter(p => p.id !== productoAEliminar.id);
        productoAEliminar = null;
        guardarCarrito();
        renderCarrito();
        var modal = bootstrap.Modal.getInstance(document.getElementById('modalAviso'));
        if (modal) modal.hide();
    }
});

// Aplicar descuento
if (btndes) btndes.addEventListener('click', () => {
    const code = (descInput ? descInput.value.trim().toUpperCase() : '');
    if (!code) return;
    const val = codi[code] || 0;
    porcentajeAplicado = val;
    localStorage.setItem('porcentajeAplicado', porcentajeAplicado);
    renderCarrito();
});

// Pagar — aquí puedes integrar con backend o abrir modal
const btnPagar = document.getElementById('btnPagar');
if (btnPagar) btnPagar.addEventListener('click', () => {
    alert('Proceso de pago no implementado en esta versión.');
});

// Inicializar búsqueda/filtrado si ya existen filtros
document.querySelectorAll('.cs-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cs-filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroActual = btn.dataset.filtro;
        aplicarFiltros();
    });
});

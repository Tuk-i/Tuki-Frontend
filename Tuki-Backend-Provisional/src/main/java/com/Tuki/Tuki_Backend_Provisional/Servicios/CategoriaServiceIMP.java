package com.Tuki.Tuki_Backend_Provisional.Servicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Repositorys.CategoriaRepository;
import com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios.CategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

@Service
public class CategoriaServiceIMP extends BaseServiceImpl<Categoria, Long, CategoriaPostDTO, CategoriaUpdateDTO, CategoriaRespuestaDTO> implements CategoriaService {

    @Autowired
    CategoriaRepository categoriaRepository;
    @Autowired
    ProductoServiceIMP productoServiceIMP;

    // Recupera todos los productos de una categoria
    private List<ProductoRespuestaDTO>listarProductos(Long id){
        return productoServiceIMP.productosListarTodos(id);
    }

    // Recupera todos los productos activos de una categoria
    private List<ProductoRespuestaDTO>listarProductosActivos(Long id){
        return productoServiceIMP.productosListarActivos(id);
    }

    // Recupera todos los productos elimandos de una categoria
    private List<ProductoRespuestaDTO>listarProductosElminados(Long id){
        return productoServiceIMP.productosListarEliminados(id);
    }

    // Funcion que crea que crea una lista de CategoriaRespuestaDTO junto con la lista de productos pertienentes
    private List<CategoriaRespuestaDTO> construirRespuesta(List<Categoria> categorias,  Function<Long, List<ProductoRespuestaDTO>> buscarProductos
    ){
        List<CategoriaRespuestaDTO> listaRespuestas = new ArrayList<>();
        for (Categoria categoria: categorias){
            // soy re copado, pase un metodo como parametro ajajajajajaj
            CategoriaRespuestaDTO dto = construirCategoriaRespuesta(categoria, buscarProductos);
            listaRespuestas.add(dto);
        }
        return listaRespuestas;
    }

    // Fucion que crea una instancia de CategoriaRespuestaDTO
    private CategoriaRespuestaDTO construirCategoriaRespuesta(Categoria categoria, Function<Long, List<ProductoRespuestaDTO>> buscarProductos){
        return new CategoriaRespuestaDTO(categoria.getId(), categoria.getNombre(), categoria.getDescripcion(), categoria.getUrlImagen(), buscarProductos.apply(categoria.getId()));
    }


    // Lista todas las categorias con todos sus productos, independientemente de su estado (activo/elminado)
    public List<CategoriaRespuestaDTO> listarTodos(){
        List<Categoria> categorias = categoriaRepository.findAllByOrderByIdAsc();
        return construirRespuesta(categorias, this::listarProductos);
    }

    // Lista todas las Categorias activas, junto con todos sus productos independientemente de su estado (activo/elminado)
    @Override
    public List<CategoriaRespuestaDTO> listarActivos(){
        List<Categoria> categorias = categoriaRepository.findByEliminadoFalseOrderByIdAsc();
        return construirRespuesta(categorias, this::listarProductos);
    }

    // Lista todas las Categorias elminadas, cada vez que se elminada una categoria, todos sus productos se elminan
    @Override
    public List<CategoriaRespuestaDTO> listarEliminados(){
        List<Categoria> categorias = categoriaRepository.findByEliminadoTrueOrderByIdAsc();
        return construirRespuesta(categorias, this::listarProductos);
    }

//    // Metodo que verifica la exisencia de una categoria
//    private Categoria verificarExisencia(Long id){
//        return categoriaRepository.findById(id)
//                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoría no encontrada"));
//    }

    // Lista todos los productos de una categoria en especifico
    public ResponseEntity<?> listarTodosLosProductos(Long id){
            Categoria categoria = buscarPorId(id);
        return ResponseEntity.ok(construirCategoriaRespuesta(categoria,this::listarProductos));
    }

    // Lista todos los productos activos de una categoria en especifico
    public ResponseEntity<?> listarTodosLosProductosActivos(Long id){
        Categoria categoria = buscarPorId(id);
        return ResponseEntity.ok(construirCategoriaRespuesta(categoria,this::listarProductosActivos));
    }

    // Lista todos los productos eliminados de una categoria en especifico
    public ResponseEntity<?> listarTodosLosProductosEliminados(Long id){
        Categoria categoria = buscarPorId(id);
        return ResponseEntity.ok(construirCategoriaRespuesta(categoria,this::listarProductosElminados));
    }

//    @Override
//    public List<CategoriaRespuestaDTO> listarTodos(){
//        List<Categoria> categorias =  baseRepository.findAllByOrderByIdAsc();
//        List<CategoriaRespuestaDTO> listaRespuesta = new ArrayList<>();
//        for (Categoria c: categorias){
//            CategoriaRespuestaDTO categoriaRespuesta = new CategoriaRespuestaDTO(
//                    c.getId(),
//                    c.getNombre(),
//                    c.getDescripcion(),
//                    listarProductos(c.getId())
//                    );
//            listaRespuesta.add(categoriaRespuesta);
//        }
//        return listaRespuesta;
//    }

//    @Override
//    public List<CategoriaRespuestaDTO> listarActivos() {
//        return mapear(baseRepository.findByEliminadoFalseOrderByIdAsc());
//    }

//    @Override
//    public List<CategoriaRespuestaDTO> listarEliminados(){
//        return mapear(baseRepository.findByEliminadoTrueOrderByIdAsc());
//    }



//    @Override
//    public CategoriaRespuestaDTO crear(CategoriaPostDTO dto) {
//        Categoria categoria = baseMapper.dtoToEntity(dto);
//        categoria = baseRepository.save(categoria);
//        CategoriaRespuestaDTO categoriaRespuestaDTO = baseMapper.entityToDTO(categoria);
//        categoriaRespuestaDTO.productoRespuestaDTOS(ListarProductos(categoria.getId()));
//        return categoriaRespuestaDTO;
//    }

//    @Override
//    public ResponseEntity<?> registrar(CategoriaPostDTO dto) {
//        boolean existe = categoriaRepository.findByNombre(dto.nombre()).isPresent();
//        return registrarConValidacion(existe, "Nombre de categoría ya registrado", dto);
//    }
    //
    @Override
    public ResponseEntity<?> registrar(CategoriaPostDTO dto) {
        CategoriaRespuestaDTO creado = registrarConValidacion(categoriaRepository.findByNombre(dto.nombre()).isPresent(), "Nombre de categoría ya registrado", dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }


    @Override
    public ResponseEntity<?> editar(Long id, CategoriaUpdateDTO dto) {
        Categoria categoria = buscarPorId(id);

        if (categoria.getEliminado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La categoría está eliminada");
        }

        Optional<Categoria> existente = categoriaRepository.findByNombre(dto.nombre());
        if (existente.isPresent() && !existente.get().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de categoría ya está en uso");
        }

        CategoriaRespuestaDTO actualizado = super.actualizar(id, dto);
        return ResponseEntity.ok(actualizado);
    }


//    @Override
//    public ResponseEntity<?> editar(Long id, CategoriaUpdateDTO dto) {
//        Optional<Categoria> categoria = categoriaRepository.findById(id);
//        if (categoria.isEmpty()) {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body(new ErrorDTO("Categoría no encontrada", ex.getStatusCode().value()));
//        }
//
//        if (categoria.get().getEliminado()) {
//            throw new ResponseStatusException(HttpStatus.CONFLICT, "La categoría está eliminada");
//        }
//
//        Optional<Categoria> existente = categoriaRepository.findByNombre(dto.nombre());
//        if (existente.isPresent() && !existente.get().getId().equals(id)) {
//            return ResponseEntity.status(HttpStatus.CONFLICT)
//                    .body(new ErrorDTO("El nombre de categoría ya está en uso", ex.getStatusCode().value()));
//        }
//
//        CategoriaRespuestaDTO actualizado = super.actualizar(id, dto);
//        return ResponseEntity.ok(actualizado);
//    }
}

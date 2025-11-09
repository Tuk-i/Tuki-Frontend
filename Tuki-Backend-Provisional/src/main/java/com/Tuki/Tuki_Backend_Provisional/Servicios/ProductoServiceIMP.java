package com.Tuki.Tuki_Backend_Provisional.Servicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ErrorDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.Mappers.ProductoMapper;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Producto;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Repositorys.CategoriaRepository;
import com.Tuki.Tuki_Backend_Provisional.Repositorys.ProductoRepository;
import com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class ProductoServiceIMP extends BaseServiceImpl<Producto, Long, ProductoPostDTO, ProductoUpdateDTO, ProductoRespuestaDTO> implements ProductoService {

    @Autowired
    ProductoRepository productoRepository;
    @Autowired
    CategoriaRepository categoriaRepository;
    @Autowired
    ProductoMapper productoMapper;

    // Se reecribe el metodo crear
    // Crea un producto y la vicula con la categoria correspondiente
    @Override
    public ProductoRespuestaDTO crear(ProductoPostDTO dto){
        Categoria categoria = categoriaRepository.findById(dto.categoriaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La categoría no existe"));

        if (categoria.getEliminado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se puede crear un producto en una categoría eliminada");
        }

        Producto producto = productoMapper.dtoToEntity(dto);

        producto.vincularConCategoria(categoria);

        Producto guardado = productoRepository.save(producto);

        return productoMapper.entityToDTO(guardado);
    }

    // Lista todos los productos de una categoria
    @Override
    public List<ProductoRespuestaDTO> productosListarTodos(Long idCategoria) {
        return mapear(productoRepository.findByCategoriaIdOrderByIdAsc(idCategoria));
    }

    // Lista todos los productos activos de una categoria
    @Override
    public List<ProductoRespuestaDTO> productosListarActivos(Long idCategoria) {
        return mapear(productoRepository.findByCategoriaIdAndEliminadoFalseOrderByIdAsc(idCategoria));
    }

    // Lista todos los productos eliminados de una categoria
    @Override
    public List<ProductoRespuestaDTO> productosListarEliminados(Long idCategoria) {
        return mapear(productoRepository.findByCategoriaIdAndEliminadoTrueOrderByIdAsc(idCategoria));
    }

    // busca una instancia en la base de datos y luego verifica
    @Override
    public ResponseEntity<?> registrar(ProductoPostDTO dto) {

        boolean existe = productoRepository.existsByNombreAndCategoriaId(dto.nombre(), dto.categoriaId());
        return ResponseEntity.ok(registrarConValidacion(existe, "Ya existe un producto con ese nombre en esta categoría", dto));
    }

    // Edita el producto validando si existe otro producto con el mismo nombre en la categoria y tambien validando el estado de la categoria
    @Override
    public ResponseEntity<?> editar(Long id, ProductoUpdateDTO dto) {
        Producto producto = buscarPorId(id);

        boolean duplicado = productoRepository.existsByNombreAndCategoriaIdAndIdNot(dto.nombre(), dto.categoriaId(), id);

        if (duplicado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un producto con ese nombre en esta categoría");
        }

        if (producto.getCategoria().getEliminado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La categoría está eliminada");
        }

        ProductoRespuestaDTO actualizado = super.actualizar(id, dto);
        return ResponseEntity.ok(actualizado);
    }


//    @Override
//    public ResponseEntity<?> editar(Long id, ProductoUpdateDTO dto) {
//        Optional<Producto> existente = productoRepository.findByNombreAndCategoriaId(dto.nombre(), dto.categoriaId());
//
//
//        if (existente.isPresent() && !existente.get().getId().equals(id)) {
//            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un producto con ese nombre en esta categoría");
//        }
//
//        if (existente.get().getCategoria().getEliminado()){
//            throw new ResponseStatusException(HttpStatus.CONFLICT, "La categoría está eliminada");
//        }
//
//        ProductoRespuestaDTO actualizado = super.actualizar(id, dto);
//        return ResponseEntity.ok(actualizado);
//    }
}

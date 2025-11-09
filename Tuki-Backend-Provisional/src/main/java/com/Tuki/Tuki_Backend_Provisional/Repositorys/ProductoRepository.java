package com.Tuki.Tuki_Backend_Provisional.Repositorys;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Producto;

import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends BaseRepository<Producto, Long>  {
    List<Producto> findByCategoriaIdAndEliminadoFalseOrderByIdAsc(Long categoriaId);

    List<Producto> findByCategoriaIdAndEliminadoTrueOrderByIdAsc(Long categoriaId);

    List<Producto> findByCategoriaIdOrderByIdAsc(Long categoriaId);

    boolean existsByNombreAndCategoriaId(String nombre, Long categoriaId);

    boolean existsByNombreAndCategoriaIdAndIdNot(String nombre, Long categoriaId, Long id);

//    Optional<Producto> findByNombreAndCategoriaId(String nombre, Long categoriaId);

}

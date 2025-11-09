package com.Tuki.Tuki_Backend_Provisional.Repositorys;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Usuario;

import java.util.Optional;

public interface CategoriaRepository extends BaseRepository<Categoria, Long>  {
    Optional<Categoria> findByNombre(String nombre);
}

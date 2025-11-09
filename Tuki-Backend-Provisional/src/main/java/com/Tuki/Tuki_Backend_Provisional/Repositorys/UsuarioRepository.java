package com.Tuki.Tuki_Backend_Provisional.Repositorys;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Usuario;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends BaseRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
}

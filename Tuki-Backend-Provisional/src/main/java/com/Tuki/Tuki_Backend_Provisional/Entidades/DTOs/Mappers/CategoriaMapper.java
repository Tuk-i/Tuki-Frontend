package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.Mappers;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaUpdateDTO;
import org.springframework.stereotype.Component;

@Component
public class CategoriaMapper implements BaseMapper<Categoria, CategoriaPostDTO, CategoriaUpdateDTO, CategoriaRespuestaDTO>{
    @Override
    public Categoria dtoToEntity(CategoriaPostDTO dtocreate) {
        Categoria categoria = new Categoria();
        categoria.setNombre(dtocreate.nombre());
        categoria.setDescripcion(dtocreate.descripcion());
        categoria.setUrlImagen(dtocreate.urlImagen());
        return categoria;
    }

    @Override
    public CategoriaRespuestaDTO entityToDTO(Categoria categoria) {
        return new CategoriaRespuestaDTO(categoria.getId(),categoria.getNombre(),categoria.getDescripcion(), categoria.getUrlImagen(), null);
    }

    @Override
    public void actualizarEntidad(Categoria categoria, CategoriaUpdateDTO dto) {

        if (dto.nombre() != null && !dto.nombre().isBlank() && !dto.nombre().equals(categoria.getNombre())) {
            categoria.setNombre(dto.nombre());
        }

        if (dto.descripcion() != null && !dto.descripcion().isBlank() && !dto.descripcion().equals(categoria.getDescripcion())) {
            categoria.setDescripcion(dto.descripcion());
        }

        if (dto.urlImagen() != null && !dto.urlImagen().isBlank() && !dto.urlImagen().equals(categoria.getUrlImagen())) {
            categoria.setUrlImagen(dto.urlImagen());
        }

    }
}

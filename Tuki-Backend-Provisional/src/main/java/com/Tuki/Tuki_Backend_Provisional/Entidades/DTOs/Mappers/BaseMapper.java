package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.Mappers;


public interface BaseMapper<E, DTOPost, DTOUpdate, DTOrespueta > {
    E dtoToEntity(DTOPost dtocreate);
    DTOrespueta entityToDTO(E entidad);
    void actualizarEntidad(E entidad, DTOUpdate dto);
}


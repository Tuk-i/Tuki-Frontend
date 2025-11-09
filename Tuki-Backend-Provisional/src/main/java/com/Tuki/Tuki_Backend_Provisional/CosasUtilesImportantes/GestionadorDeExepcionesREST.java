package com.Tuki.Tuki_Backend_Provisional.CosasUtilesImportantes;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ErrorDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GestionadorDeExepcionesREST {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorDTO> manejarResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        ErrorDTO error = new ErrorDTO(
                ex.getReason(),            // ruta
                ex.getStatusCode().value()
        );
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}

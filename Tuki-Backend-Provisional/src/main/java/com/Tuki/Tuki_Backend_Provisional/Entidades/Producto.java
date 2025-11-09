package com.Tuki.Tuki_Backend_Provisional.Entidades;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "producto", uniqueConstraints = @UniqueConstraint(columnNames = {"nombre", "categoria_id"}))
public class Producto extends Base{
    private String nombre;
    private String descripcion;
    private double precio;
    private Long stock;
    private String urlImagen;

    @ManyToOne
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;



    public void vincularConCategoria(Categoria categoria) {
        this.categoria = categoria;
        categoria.agregrarProducto(this);
    }

}

package com.Tuki.Tuki_Backend_Provisional.Entidades;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Categoria extends Base{
    @Column(unique = true, nullable = false)
    private String nombre;
    private String descripcion;
    private String urlImagen;


//    @OneToMany(mappedBy = "categoria", fetch = FetchType.EAGER)
//    @OneToMany(mappedBy = "categoria", cascade = (CascadeType.REFRESH))
//    @OneToMany(mappedBy = "categoria", cascade = CascadeType.ALL)
    @OneToMany(mappedBy = "categoria")
    @Builder.Default
    private List<Producto> productos = new ArrayList<>();


    public void agregrarProducto(Producto p){
        if (!productos.contains(p)) {
            productos.add(p);
        }
    }


    public void eliminarTodosLosProductos(){
        if (productos != null) {
            for (Producto p : productos){
                p.setEliminado(true);
            }
        }
    }


    @Override
    public void setEliminado(Boolean valor){
        eliminarTodosLosProductos();
        this.eliminado = valor;
    }
}

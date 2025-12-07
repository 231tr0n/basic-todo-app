package com.example.todo.entities;

import com.example.todo.enums.RoleEnum;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@NoArgsConstructor
@Data
public class RoleEntity {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  private Long id;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, unique = true)
  private RoleEnum role;

  @NotNull
  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id")
  private UserEntity user;
}

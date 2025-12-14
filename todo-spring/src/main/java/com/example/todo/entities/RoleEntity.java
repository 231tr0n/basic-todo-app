package com.example.todo.entities;

import com.example.todo.enums.RoleEnum;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;
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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Entity
@Table(
    name = "roles",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "unique_user_role",
          columnNames = {"user_id", "role"})
    })
@Data
public class RoleEntity {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private long id;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RoleEnum role;

  @NotNull
  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id")
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private UserEntity user;
}

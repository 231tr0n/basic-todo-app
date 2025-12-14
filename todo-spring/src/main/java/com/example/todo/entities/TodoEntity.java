package com.example.todo.entities;

import com.example.todo.enums.StatusEnum;
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
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Entity
@Table(name = "todos")
@Data
public class TodoEntity {
  @Id
  @NotNull
  @Min(value = 1)
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private long id;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false)
  private String title;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false)
  private String description;

  @NotNull
  @Size(min = 1, max = 255)
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StatusEnum status;

  @NotNull
  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id")
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private UserEntity user;
}

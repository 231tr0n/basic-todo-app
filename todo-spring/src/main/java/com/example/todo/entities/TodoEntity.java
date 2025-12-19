package com.example.todo.entities;

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
import jakarta.persistence.PreRemove;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Entity
@Table(name = "todos")
@Data
public class TodoEntity {
  @Id
  @NotNull
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
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StatusEnum status;

  @NotNull
  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id")
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  @ToString.Exclude
  private UserEntity user;

  public enum StatusEnum {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED
  }

  @PreRemove
  public void preRemove() {
    this.user.getTodos().remove(this);
  }
}

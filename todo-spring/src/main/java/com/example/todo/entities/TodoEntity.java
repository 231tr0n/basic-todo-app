package com.example.todo.entities;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "todos")
@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TodoEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  private long id;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(nullable = false, length = 255)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 255)
  private StatusEnum status;

  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
  @ToString.Exclude
  private UserEntity user;

  public enum StatusEnum {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED
  }
}

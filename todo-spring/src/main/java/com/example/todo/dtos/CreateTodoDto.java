package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateTodoDto {
  @NotNull
  @Size(min = 1, max = 255)
  private String title;

  @NotNull
  @Size(min = 1, max = 255)
  private String description;
}

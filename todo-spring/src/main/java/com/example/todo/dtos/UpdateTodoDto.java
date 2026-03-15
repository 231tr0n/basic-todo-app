package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateTodoDto {
  @Size(min = 1, max = 255)
  private String title;

  @Size(min = 1, max = 255)
  private String description;
}

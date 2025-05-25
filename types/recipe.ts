export interface RecipeItem {
    id: string;
    name: string;
    ingredients: string;
    instructions: string;
    category?: string;
    prepTime?: string;
    cookTime?: string;
    isFavorite?: boolean;
    createdAt: string | Date;
    updatedAt?: string | Date;
}
export interface Word {
    id: string | number;
    english: string;
    chinese: string;
    phonetic_us?: string;
    phonetic_uk?: string;
    example_en?: string;
    example_cn?: string;
    tags?: string[];
}